import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const root = process.cwd(); const evidence = join(root, 'artifacts/go-03/ep-09/raw-evidence');
rmSync(evidence, { recursive: true, force: true }); mkdirSync(evidence, { recursive: true });
const version = (binary, args) => {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? (result.stdout ?? '').trim() : 'UNAVAILABLE';
};
const pnpmVersion = version('pnpm', ['--version']);
const bicepVersion = version('/tmp/ep01-tools/bicep-linux-x64', ['--version']);
const records = [
  ['ep09-lock-validation.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'lock']], ['ep09-dependency-audit.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'audit']], ['ep09-sbom.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'sbom']], ['ep09-build-a.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'build-a']], ['ep09-build-b.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'build-b']], ['ep09-artifact-provenance.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'artifact']], ['ep09-reproducibility.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'reproducibility']], ['ep09-provenance-verify.txt', 'node', ['infra/cicd/ep09/scripts/run-local-release-pipeline.mjs', 'verify']], ['ep09-runtime-release-security.txt', 'node', ['--test', 'infra/cicd/ep09/tests/runtime-release-security.test.mjs']], ['ep09-security-regression.txt', 'node', ['--test', 'infra/identity/ep05/tests/runtime-authorization.test.mjs', 'infra/storage/ep04/tests/runtime-object-isolation.test.mjs', 'infra/audit/ep06/tests/runtime-audit-security.test.mjs', 'infra/secrets/ep07/tests/runtime-secret-key-security.test.mjs', 'infra/recovery/ep08/tests/runtime-recovery.test.mjs']], ['ep09-secret-leakage.txt', 'node', ['infra/cicd/ep09/scripts/verify-release-secret-boundary.mjs']], ['ep09-m11-ci-regression.txt', 'node', ['scripts/m11_verify_ci_config.mjs']], ['ep09-static-security.txt', 'node', ['infra/tests/ep09-security-rules.mjs']], ['ep09-negative-fixtures.txt', 'node', ['infra/tests/negative-ep09.mjs']], ['ep09-bicep-build.txt', '/tmp/ep01-tools/bicep-linux-x64', ['build-params', 'infra/bicep/network/params/controlled.bicepparam']],
];
let failures = 0;
for (const [file, binary, args] of records) { const startedAt = Date.now(); const started = new Date(startedAt).toISOString(); const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8' }); const finishedAt = Date.now(); const finished = new Date(finishedAt).toISOString(); const exitCode = result.status ?? 1; writeFileSync(join(evidence, file), [`STARTED=${started}`, `FINISHED=${finished}`, `ELAPSED_MS=${finishedAt - startedAt}`, `NODE_VERSION=${process.version}`, `PNPM_VERSION=${pnpmVersion}`, `BICEP_VERSION=${bicepVersion}`, `COMMAND=${[binary, ...args].join(' ')}`, `EXIT_CODE=${exitCode}`, 'STDOUT_BEGIN', result.stdout ?? '', 'STDOUT_END', 'STDERR_BEGIN', result.stderr ?? '', 'STDERR_END', ''].join('\n')); if (exitCode !== 0 && file !== 'ep09-dependency-audit.txt' && file !== 'ep09-sbom.txt') failures += 1; }
if (failures) process.exitCode = 1;
