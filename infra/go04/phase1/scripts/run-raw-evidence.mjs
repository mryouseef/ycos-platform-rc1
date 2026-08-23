import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'artifacts/go-04/phase-1/raw-evidence')
mkdirSync(out, { recursive: true })
const commands = [
  ['go04-p1-static-governance.txt', 'node', ['infra/tests/go04-phase1-governance-rules.mjs']],
  ['go04-p1-negative-fixtures.txt', 'node', ['infra/tests/negative-go04-phase1.mjs']],
  ['go04-p1-carried-findings.txt', 'grep', ['-E', 'F-GO02-01|F-M11-01|F-M11-02|F-EP09-01', 'artifacts/go-04/phase-0/go-04-carried-findings-register.md']],
  ['go04-p1-m14-blockers.txt', 'grep', ['-E', 'B-0[1-6]|0 CLOSED / 6 OPEN', 'artifacts/go-04/phase-0/go-04-m14-production-blocker-register.md']]
]
for (const [file, command, args] of commands) {
  let output = `$ ${command} ${args.join(' ')}\n`
  let code = 0
  try { output += execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (error) { code = error.status ?? 1; output += `${error.stdout ?? ''}${error.stderr ?? ''}` }
  output += `\nEXIT_CODE=${code}\n`
  writeFileSync(join(out, file), output)
  if (code !== 0) process.exitCode = code
}
if (process.exitCode) throw new Error('GO-04 Phase 1 raw evidence failed')
