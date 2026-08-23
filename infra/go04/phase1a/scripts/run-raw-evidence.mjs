import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'artifacts/go-04/phase-1a/raw-evidence');
fs.mkdirSync(out, { recursive: true });
const commands = [
  ['ep1a-governance.txt', 'node', ['infra/tests/go04-phase1a-governance-rules.mjs']],
  ['ep1a-negative.txt', 'node', ['infra/tests/negative-go04-phase1a.mjs']],
  ['ep1a-source-count.txt', 'bash', ['-lc', "grep -c '^| P1A-S-' artifacts/go-04/phase-1a/go-04-p1a-source-register.md"]],
];
let failed = 0;
for (const [file, command, args] of commands) {
  let stdout = '', stderr = '', code = 0;
  try { stdout = execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { code = error.status ?? 1; stdout = error.stdout?.toString() ?? ''; stderr = error.stderr?.toString() ?? error.message; failed++; }
  fs.writeFileSync(path.join(out, file), `COMMAND: ${command} ${args.join(' ')}\nEXIT_CODE: ${code}\n--- STDOUT ---\n${stdout}\n--- STDERR ---\n${stderr}\n`);
}
console.log(`RAW_EVIDENCE | ${commands.length - failed}/${commands.length} PASS`);
process.exit(failed ? 1 : 0);
