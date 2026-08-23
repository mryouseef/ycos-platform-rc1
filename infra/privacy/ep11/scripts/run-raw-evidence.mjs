import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd(); const out = join(root, 'artifacts/go-03/ep-11/raw-evidence');
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
const commands = [
  ['ep11-runtime-privacy.txt', 'node', ['--test','infra/privacy/ep11/tests/runtime-privacy-lifecycle.test.mjs']],
  ['ep11-static-security.txt', 'node', ['infra/tests/ep11-security-rules.mjs']],
  ['ep11-negative-fixtures.txt', 'node', ['infra/tests/negative-ep11.mjs']],
  ['ep11-bicep-build.txt', '/tmp/ep10-tools/bicep-linux-x64', ['build','infra/bicep/network/main.bicep','--outfile','/tmp/ep11-main.json']],
  ['ep11-bicep-params.txt', '/tmp/ep10-tools/bicep-linux-x64', ['build-params','infra/bicep/network/params/controlled.bicepparam','--outfile','/tmp/ep11-params.json']],
  ['ep11-postgres-lifecycle.txt', 'bash', ['infra/db/ep11/scripts/run-local-postgres-ep11.sh']]
];
for (const [name, command, args] of commands) {
  const started = new Date().toISOString(); const began = Date.now(); let stdout = ''; let stderr = ''; let exitCode = 0;
  try { stdout = execFileSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, PG_BIN_DIR: '/usr/lib/postgresql/16/bin' } }); } catch (error) { stdout = error.stdout?.toString() ?? ''; stderr = error.stderr?.toString() ?? error.message; exitCode = error.status ?? 1; }
  const body = `started_at=${started}\nelapsed_ms=${Date.now() - began}\ncommand=${command} ${args.join(' ')}\nnode=${process.version}\nexit_code=${exitCode}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}\n`;
  await writeFile(join(out, name), body); if (exitCode !== 0) throw new Error(`EP11_RAW_EVIDENCE_FAILED ${name}`);
}
console.log(`EP11_RAW_EVIDENCE_PASS ${commands.length}`);

