import test from 'node:test';
import assert from 'node:assert/strict';
import { ReleaseSecurityDomain, assertNoSentinelLeakage } from '../src/release-security-domain.mjs';

const domain = new ReleaseSecurityDomain();
const sourceRevision = 'ab80af05117355ae1478fdc1191cf7829ddfd118';
const lockfileSha256 = 'a'.repeat(64);
const makeRelease = () => {
  const { artifact, artifact_sha256 } = domain.createArtifact({ sourceRevision, lockfileSha256, buildOutputSha256: 'b'.repeat(64), version: '1.0.0-ep09', sbomStatus: 'PARTIAL' });
  const provenance = domain.createProvenance({ artifact, artifactSha256: artifact_sha256, sourceRevision, lockfileSha256, sbomSha256: 'c'.repeat(64), testEvidence: ['raw-evidence'] });
  return { artifact, artifact_sha256, provenance };
};

test('EP-09 verifies the exact synthetic artifact and provenance', () => {
  const release = makeRelease();
  assert.equal(domain.verifyArtifact({ artifact: release.artifact, artifactSha256: release.artifact_sha256 }).decision, 'ALLOW');
  assert.equal(domain.verifyProvenance({ provenance: release.provenance, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256 }).decision, 'ALLOW');
});

test('EP-09 detects artifact, provenance, and lockfile tampering', () => {
  const release = makeRelease();
  assert.equal(domain.verifyArtifact({ artifact: { ...release.artifact, version: 'tampered' }, artifactSha256: release.artifact_sha256 }).decision, 'DENY');
  assert.equal(domain.verifyProvenance({ provenance: { ...release.provenance, source_revision: 'tampered' }, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256 }).decision, 'DENY');
  assert.equal(domain.verifyProvenance({ provenance: release.provenance, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256: 'd'.repeat(64) }).decision, 'DENY');
});

test('EP-09 separates builder from high-risk release approver', () => {
  const release = makeRelease();
  const artifactVerification = domain.verifyArtifact({ artifact: release.artifact, artifactSha256: release.artifact_sha256 });
  const provenanceVerification = domain.verifyProvenance({ provenance: release.provenance, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256 });
  assert.equal(domain.authorizeRelease({ artifactVerification, provenanceVerification, validationPassed: true, rawEvidencePresent: true, actorId: 'EP09_LOCAL_BUILDER', changeAuthorId: 'EP09_LOCAL_BUILDER' }).reason, 'RELEASE_AUTHORITY_REQUIRED');
  assert.equal(domain.authorizeRelease({ artifactVerification, provenanceVerification, validationPassed: true, rawEvidencePresent: true, actorId: 'EP09_RELEASE_APPROVER', changeAuthorId: 'EP09_RELEASE_APPROVER' }).reason, 'HIGH_RISK_SELF_APPROVAL_DENIED');
  assert.equal(domain.authorizeRelease({ artifactVerification, provenanceVerification, validationPassed: true, rawEvidencePresent: true, actorId: 'EP09_RELEASE_APPROVER', changeAuthorId: 'EP09_CHANGE_AUTHOR' }).decision, 'ALLOW');
});

test('EP-09 denies production promotion, unknown rollback, and missing evidence', () => {
  const release = makeRelease();
  const artifactVerification = domain.verifyArtifact({ artifact: release.artifact, artifactSha256: release.artifact_sha256 });
  assert.equal(domain.requestPromotion({ targetEnvironment: 'production', artifactVerification, deploymentAuthority: 'EP09_TEST_DEPLOYMENT_AUTHORITY' }).decision, 'DENY');
  assert.equal(domain.requestPromotion({ targetEnvironment: 'test', artifactVerification, deploymentAuthority: 'WRONG' }).decision, 'DENY');
  assert.equal(domain.requestRollback({ verifiedArtifact: false, compatibilityAssessed: true, actorId: 'EP09_RELEASE_APPROVER' }).decision, 'DENY');
  assert.equal(domain.requestRollback({ verifiedArtifact: true, compatibilityAssessed: true, actorId: 'EP09_RELEASE_APPROVER' }).decision, 'ALLOW');
});

test('EP-09 rejects reusable sentinel leakage', () => {
  assert.equal(assertNoSentinelLeakage('safe-output', 'EP09_REUSABLE_SENTINEL').decision, 'ALLOW');
  assert.equal(assertNoSentinelLeakage('EP09_REUSABLE_SENTINEL', 'EP09_REUSABLE_SENTINEL').decision, 'DENY');
});

test('EP-09 creates structured release audit evidence without secret material', () => {
  const release = makeRelease();
  const event = domain.createReleaseAuditEvent({ eventType: 'release.authorization.denied', actorId: 'EP09_RELEASE_APPROVER', artifactId: release.artifact.artifact_id, decision: 'DENY', reason: 'HIGH_RISK_SELF_APPROVAL_DENIED', correlationId: 'EP09-CORRELATION-001' });
  assert.equal(event.decision, 'DENY');
  assert.equal(event.effective_subject, 'EP09_RELEASE_APPROVER');
  assert.equal('secret_material' in event, true);
  assert.equal(event.secret_material, undefined);
});
