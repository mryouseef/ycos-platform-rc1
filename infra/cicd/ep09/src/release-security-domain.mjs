import { createHash } from 'node:crypto';

export const sha256 = (value) =>
  createHash('sha256').update(typeof value === 'string' ? value : Buffer.from(value)).digest('hex');

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function artifactDigest(artifact) {
  return sha256(canonicalJson(artifact));
}

export class ReleaseSecurityDomain {
  constructor({ builderId = 'EP09_LOCAL_BUILDER', releaseApproverId = 'EP09_RELEASE_APPROVER' } = {}) {
    this.builderId = builderId;
    this.releaseApproverId = releaseApproverId;
  }

  createArtifact({ sourceRevision, lockfileSha256, buildOutputSha256, version, sbomStatus }) {
    const artifact = {
      artifact_id: `ycos-ep09-${sourceRevision.slice(0, 12)}-${version}`,
      source_revision: sourceRevision,
      lockfile_sha256: lockfileSha256,
      build_output_sha256: buildOutputSha256,
      version,
      sbom_status: sbomStatus,
      release_status: 'VALIDATED',
      synthetic: true,
    };
    return { artifact, artifact_sha256: artifactDigest(artifact) };
  }

  verifyArtifact({ artifact, artifactSha256 }) {
    if (!artifact || !artifactSha256 || artifactDigest(artifact) !== artifactSha256) return { decision: 'DENY', reason: 'ARTIFACT_INTEGRITY_MISMATCH' };
    return { decision: 'ALLOW', reason: 'ARTIFACT_INTEGRITY_VERIFIED' };
  }

  createProvenance({ artifact, artifactSha256, sourceRevision, lockfileSha256, sbomSha256, testEvidence }) {
    return { predicate_type: 'LOCAL_SYNTHETIC_PROVENANCE_V1', builder_id: this.builderId, artifact_id: artifact.artifact_id, artifact_sha256: artifactSha256, source_revision: sourceRevision, lockfile_sha256: lockfileSha256, sbom_sha256: sbomSha256, test_evidence: testEvidence, remote_attestation: false, production_signing: false };
  }

  verifyProvenance({ provenance, artifactSha256, sourceRevision, lockfileSha256 }) {
    if (!provenance || provenance.artifact_sha256 !== artifactSha256) return { decision: 'DENY', reason: 'PROVENANCE_ARTIFACT_MISMATCH' };
    if (provenance.source_revision !== sourceRevision) return { decision: 'DENY', reason: 'PROVENANCE_SOURCE_MISMATCH' };
    if (provenance.lockfile_sha256 !== lockfileSha256) return { decision: 'DENY', reason: 'PROVENANCE_LOCKFILE_MISMATCH' };
    return { decision: 'ALLOW', reason: 'PROVENANCE_VERIFIED' };
  }

  authorizeRelease({ artifactVerification, provenanceVerification, validationPassed, rawEvidencePresent, actorId, changeAuthorId, highRisk = true }) {
    if (!validationPassed) return { decision: 'DENY', reason: 'VALIDATION_FAILED' };
    if (!rawEvidencePresent) return { decision: 'DENY', reason: 'RAW_EVIDENCE_MISSING' };
    if (artifactVerification.decision !== 'ALLOW' || provenanceVerification.decision !== 'ALLOW') return { decision: 'DENY', reason: 'INTEGRITY_OR_PROVENANCE_FAILED' };
    if (actorId !== this.releaseApproverId) return { decision: 'DENY', reason: 'RELEASE_AUTHORITY_REQUIRED' };
    if (highRisk && actorId === changeAuthorId) return { decision: 'DENY', reason: 'HIGH_RISK_SELF_APPROVAL_DENIED' };
    return { decision: 'ALLOW', reason: 'RELEASE_AUTHORIZED' };
  }

  requestPromotion({ targetEnvironment, artifactVerification, deploymentAuthority }) {
    if (targetEnvironment === 'production') return { decision: 'DENY', reason: 'PRODUCTION_DEPLOYMENT_NOT_AUTHORIZED' };
    if (targetEnvironment !== 'test') return { decision: 'DENY', reason: 'ENVIRONMENT_NOT_AUTHORIZED' };
    if (deploymentAuthority !== 'EP09_TEST_DEPLOYMENT_AUTHORITY') return { decision: 'DENY', reason: 'DEPLOYMENT_AUTHORITY_REQUIRED' };
    if (artifactVerification.decision !== 'ALLOW') return { decision: 'DENY', reason: 'ARTIFACT_INTEGRITY_REQUIRED' };
    return { decision: 'ALLOW', reason: 'TEST_PROMOTION_MODELED_ONLY' };
  }

  requestRollback({ verifiedArtifact, compatibilityAssessed, actorId }) {
    if (!verifiedArtifact) return { decision: 'DENY', reason: 'PREVIOUSLY_VERIFIED_ARTIFACT_REQUIRED' };
    if (!compatibilityAssessed) return { decision: 'DENY', reason: 'COMPATIBILITY_ASSESSMENT_REQUIRED' };
    if (actorId !== this.releaseApproverId) return { decision: 'DENY', reason: 'ROLLBACK_AUTHORITY_REQUIRED' };
    return { decision: 'ALLOW', reason: 'ROLLBACK_MODELED_ONLY' };
  }

  createReleaseAuditEvent({ eventType, actorId, artifactId, decision, reason, correlationId }) {
    if (!eventType || !actorId || !artifactId || !decision || !reason || !correlationId) throw new Error('EP09_RELEASE_AUDIT_FIELDS_REQUIRED');
    return { event_type: eventType, actor_id: actorId, effective_subject: actorId, artifact_id: artifactId, decision, reason, correlation_id: correlationId, secret_material: undefined };
  }
}

export function assertNoSentinelLeakage(text, sentinel) {
  return { leaked: String(text).includes(sentinel), decision: String(text).includes(sentinel) ? 'DENY' : 'ALLOW' };
}
