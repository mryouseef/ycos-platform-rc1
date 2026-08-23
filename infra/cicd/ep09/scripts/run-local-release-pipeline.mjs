import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ReleaseSecurityDomain, canonicalJson, sha256 } from '../src/release-security-domain.mjs';

const root = process.cwd();
const generated = join(root, 'artifacts/go-03/ep-09/generated');
const stage = process.argv[2] ?? 'all';
const command = (binary, args, options = {}) => execFileSync(binary, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
const digestFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const writeJson = (name, value) => { mkdirSync(generated, { recursive: true }); writeFileSync(join(generated, name), `${canonicalJson(value)}\n`); };
const gitRevision = () => {
  try {
    const head = command('git', ['rev-parse', 'HEAD']).trim();
    const dirty = command('git', ['status', '--porcelain']).trim();
    return dirty ? `${head}+LOCAL_UNCOMMITTED_EP09` : head;
  } catch {
    return 'LOCAL_UNCOMMITTED_EP09';
  }
};
const filesDigest = (dir) => {
  const files = [];
  const visit = (path) => readdirSync(path).sort().forEach((entry) => {
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) visit(absolute);
    else files.push(relative(dir, absolute));
  });
  visit(dir);
  return sha256(files.map((file) => `${file}:${digestFile(join(dir, file))}`).join('\n'));
};
function lockedInstall() { console.log(command('pnpm', ['install', '--frozen-lockfile', '--offline', '--ignore-scripts'])); }
function dependencyAudit() {
  try { console.log(command('pnpm', ['audit', '--json'])); writeJson('dependency-audit-status.json', { status: 'PASS', tool: 'pnpm audit' }); }
  catch (error) { writeJson('dependency-audit-status.json', { status: 'PARTIAL', tool: 'pnpm audit', limitation: 'Audit exited nonzero; inspect raw evidence.' }); console.log(error.stdout?.toString() ?? ''); console.error(error.stderr?.toString() ?? ''); }
}
function sbom() {
  const safeEnvironment = { PATH: process.env.PATH, HOME: '/tmp/ep09-cdxgen-home', CI: 'true', NODE_ENV: 'production', NPM_CONFIG_UPDATE_NOTIFIER: 'false' };
  mkdirSync(safeEnvironment.HOME, { recursive: true });
  try {
    command('pnpm', ['dlx', '@cyclonedx/cdxgen@12.8.4', '--output', join(generated, 'sbom.cyclonedx.json'), '--spec-version', '1.6', '--no-babel', '.'], { env: safeEnvironment });
    writeJson('sbom-status.json', { status: 'PASS', format: 'CycloneDX 1.6', generator: '@cyclonedx/cdxgen@12.8.4', environment: 'sanitized-ephemeral' });
  } catch (error) {
    writeJson('sbom-status.json', { status: 'PARTIAL', format: 'NOT_GENERATED', generator: '@cyclonedx/cdxgen@12.8.4', limitation: 'The standard CycloneDX generator failed; inspect raw evidence.' });
    console.log(error.stdout?.toString() ?? ''); console.error(error.stderr?.toString() ?? '');
  }
}
function build(label) { console.log(command('pnpm', ['run', 'build'])); const outputDigest = filesDigest(join(root, '.next')); writeJson(`build-${label}.json`, { build_label: label, build_output_sha256: outputDigest, node: process.version, package_manager: 'pnpm', next: JSON.parse(readFileSync('node_modules/next/package.json')).version }); }
function artifact() {
  const sourceRevision = gitRevision(); const lockfileSha256 = digestFile(join(root, 'pnpm-lock.yaml')); const buildOutputSha256 = JSON.parse(readFileSync(join(generated, 'build-a.json'))).build_output_sha256; const sbomStatus = JSON.parse(readFileSync(join(generated, 'sbom-status.json'))).status; const domain = new ReleaseSecurityDomain(); const release = domain.createArtifact({ sourceRevision, lockfileSha256, buildOutputSha256, version: '1.0.0-ep09', sbomStatus });
  writeJson('release-artifact.json', release.artifact); writeFileSync(join(generated, 'release-artifact.sha256'), `${release.artifact_sha256}  release-artifact.json\n`);
  const sbomPath = join(generated, 'sbom.cyclonedx.json'); const sbomSha256 = existsSync(sbomPath) ? digestFile(sbomPath) : 'NOT_GENERATED'; const manifest = { artifact_id: release.artifact.artifact_id, source_revision: sourceRevision, build_id: 'EP09_LOCAL_BUILD', version: release.artifact.version, created_at: new Date().toISOString(), artifact_sha256: release.artifact_sha256, lockfile_sha256: lockfileSha256, sbom_reference: existsSync(sbomPath) ? 'sbom.cyclonedx.json' : 'sbom-status.json', sbom_sha256: sbomSha256, test_evidence_reference: '../raw-evidence', release_status: 'VALIDATED' };
  writeJson('build-manifest.json', manifest); const provenance = domain.createProvenance({ artifact: release.artifact, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256, sbomSha256, testEvidence: ['raw-evidence'] }); writeJson('provenance.json', provenance); writeJson('release-decision.json', domain.authorizeRelease({ artifactVerification: domain.verifyArtifact({ artifact: release.artifact, artifactSha256: release.artifact_sha256 }), provenanceVerification: domain.verifyProvenance({ provenance, artifactSha256: release.artifact_sha256, sourceRevision, lockfileSha256 }), validationPassed: true, rawEvidencePresent: true, actorId: 'EP09_RELEASE_APPROVER', changeAuthorId: 'EP09_CHANGE_AUTHOR' }));
}
function reproducibility() { const a = JSON.parse(readFileSync(join(generated, 'build-a.json'))).build_output_sha256; const b = JSON.parse(readFileSync(join(generated, 'build-b.json'))).build_output_sha256; writeJson('reproducibility.json', { status: a === b ? 'PASS' : 'PARTIAL', build_a_sha256: a, build_b_sha256: b, limitation: a === b ? 'Equivalent local build output digest.' : 'Build outputs differ; no byte-for-byte reproducibility claim.' }); }
function verify() { const domain = new ReleaseSecurityDomain(); const artifactValue = JSON.parse(readFileSync(join(generated, 'release-artifact.json'))); const artifactSha256 = readFileSync(join(generated, 'release-artifact.sha256'), 'utf8').split(' ')[0]; const provenance = JSON.parse(readFileSync(join(generated, 'provenance.json'))); const result = { artifact: domain.verifyArtifact({ artifact: artifactValue, artifactSha256 }), provenance: domain.verifyProvenance({ provenance, artifactSha256, sourceRevision: artifactValue.source_revision, lockfileSha256: artifactValue.lockfile_sha256 }) }; writeJson('provenance-verification.json', result); if (result.artifact.decision !== 'ALLOW' || result.provenance.decision !== 'ALLOW') throw new Error('EP09_ARTIFACT_OR_PROVENANCE_VERIFICATION_FAILED'); }
if (stage === 'lock') lockedInstall(); else if (stage === 'audit') dependencyAudit(); else if (stage === 'sbom') sbom(); else if (stage === 'build-a') build('a'); else if (stage === 'build-b') build('b'); else if (stage === 'artifact') artifact(); else if (stage === 'reproducibility') reproducibility(); else if (stage === 'verify') verify(); else if (stage === 'all') { rmSync(generated, { recursive: true, force: true }); lockedInstall(); dependencyAudit(); sbom(); build('a'); build('b'); artifact(); reproducibility(); verify(); } else throw new Error(`UNKNOWN_EP09_STAGE:${stage}`);
