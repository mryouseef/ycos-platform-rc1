import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fixtures = join(root, 'infra/tests/fixtures/ep09');
const checks = {
  'unsafe-write-all.yml': [/permissions:\s*write-all/, 'EP09_WRITE_ALL_DETECTED'],
  'unsafe-floating-action.yml': [/uses:\s*[^\s]+@(main|v\d+|latest)/, 'EP09_FLOATING_ACTION_DETECTED'],
  'unsafe-remote-script.yml': [/(curl|wget)\s+[^\n]+\|\s*(sh|bash)/, 'EP09_REMOTE_SCRIPT_DETECTED'],
  'unsafe-hardcoded-credential.yml': [/AZURE_CLIENT_SECRET:\s*\S+/, 'EP09_HARDCODED_CREDENTIAL_DETECTED'],
  'unsafe-secret-artifact.mjs': [/EP09_REUSABLE_SENTINEL/, 'EP09_SECRET_ARTIFACT_DETECTED'],
  'unsafe-production-autodeploy.yml': [/environment:\s*production/, 'EP09_PRODUCTION_AUTODEPLOY_DETECTED'],
  'unsafe-self-approval.mjs': [/HIGH_RISK_SELF_APPROVAL_ALLOWED/, 'EP09_SELF_APPROVAL_DETECTED'],
  'unsafe-test-to-production.mjs': [/targetEnvironment:\s*production/, 'EP09_CROSS_ENV_AUTHORITY_DETECTED'],
  'unsafe-artifact-tamper.mjs': [/ARTIFACT_TAMPER_ACCEPTED/, 'EP09_ARTIFACT_TAMPER_DETECTED'],
  'unsafe-provenance-tamper.mjs': [/PROVENANCE_TAMPER_ACCEPTED/, 'EP09_PROVENANCE_TAMPER_DETECTED'],
  'unsafe-lockfile-tamper.mjs': [/LOCKFILE_TAMPER_ACCEPTED/, 'EP09_LOCKFILE_TAMPER_DETECTED'],
  'unsafe-missing-raw-evidence.mjs': [/RAW_EVIDENCE_MISSING_ACCEPTED/, 'EP09_RAW_EVIDENCE_GAP_DETECTED'],
};
const failures = [];
for (const [file, [pattern, code]] of Object.entries(checks)) {
  if (!pattern.test(readFileSync(join(fixtures, file), 'utf8'))) failures.push(`${code}:${file}`);
}
if (readdirSync(fixtures).length !== Object.keys(checks).length) failures.push('EP09_NEGATIVE_FIXTURE_SET_CHANGED');
if (failures.length) throw new Error(failures.join('\n'));
console.log(`EP09_NEGATIVE_TESTS_PASS fixtures=${Object.keys(checks).length}`);
