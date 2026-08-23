import { spawnSync } from 'node:child_process';
const command = ['node', '--test', 'infra/audit/ep06/tests/runtime-audit-security.test.mjs', 'infra/identity/ep05/tests/runtime-authorization.test.mjs', 'infra/secrets/ep07/tests/runtime-secret-key-security.test.mjs', 'infra/recovery/ep08/tests/runtime-recovery.test.mjs', 'infra/cicd/ep09/tests/runtime-release-security.test.mjs'];
const result = spawnSync(command[0], command.slice(1), { encoding: 'utf8' }); process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); process.exit(result.status ?? 1);
