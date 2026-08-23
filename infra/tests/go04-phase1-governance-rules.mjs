import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const phase = join(root, 'artifacts/go-04/phase-1')
const required = [
  'go-04-p1-authoritative-requirements.md',
  'go-04-p1-source-register.md',
  'go-04-p1-candidate-provider-register.md',
  'go-04-p1-service-sku-region-matrix.md',
  'go-04-p1-residency-transfer-model.md',
  'go-04-p1-jurisdiction-model.md',
  'go-04-p1-provider-eligibility-model.md',
  'go-04-p1-contract-dpa-model.md',
  'go-04-p1-subprocessor-support-model.md',
  'go-04-p1-security-compliance-assessment.md',
  'go-04-p1-procurement-cost-model.md',
  'go-04-p1-data-purpose-model.md',
  'go-04-p1-preliminary-shortlist.md',
  'go-04-p1-unknowns-register.md',
  'go-04-p1-external-decision-requests.md',
  'go-04-p1-reversibility-exit-model.md',
  'go-04-p1-carried-finding-impact.md',
  'go-04-p1-m14-impact.md'
]
const result = []
const check = (name, ok, detail) => { result.push({ name, ok, detail }); if (!ok) process.exitCode = 1 }
check('P1-01 required models', required.every((file) => existsSync(join(phase, file))), `${required.filter((file) => !existsSync(join(phase, file))).join(', ') || 'all present'}`)
const files = readdirSync(phase).filter((file) => file.endsWith('.md'))
const text = files.map((file) => readFileSync(join(phase, file), 'utf8')).join('\n')
const source = readFileSync(join(phase, 'go-04-p1-source-register.md'), 'utf8')
const sourceRows = source.split('\n').filter((line) => line.startsWith('| SRC-P1-'))
check('P1-02 official source URLs', (source.match(/https:\/\//g) || []).length >= 16, `${(source.match(/https:\/\//g) || []).length} URLs`)
check('P1-03 source limitations', sourceRows.length >= 16 && sourceRows.every((row) => row.split('|').length >= 7 && row.split('|').at(-2).trim().length > 20), `${sourceRows.length} registered sources carry limits`)
check('P1-04 provider approval denied', /Explicit provider-eligibility decision \| Authorized decision \| \*\*NOT GRANTED\*\*/.test(text), 'explicit NOT GRANTED')
check('P1-05 real data denied', /\*\*NOT AUTHORIZED\*\*/.test(readFileSync(join(phase, 'go-04-p1-data-purpose-model.md'), 'utf8')), 'data-purpose authority denied')
check('P1-06 phase 2 denied', !/PHASE 2:\s*AUTHORIZED/i.test(text), 'no Phase 2 authorization')
check('P1-07 carried findings open', /F-GO02-01[\s\S]*\*\*OPEN/.test(readFileSync(join(phase, 'go-04-p1-carried-finding-impact.md'), 'utf8')), 'F-GO02-01 remains open')
check('P1-08 M14 remains open', /0 CLOSED \/ 6 OPEN/.test(readFileSync(join(phase, 'go-04-p1-m14-impact.md'), 'utf8')), 'M-14 count preserved')
check('P1-09 no production claim', !/PRODUCTION READY\s*\|\s*\*\*YES/i.test(text), 'no affirmative production-ready claim')
for (const row of result) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}: ${row.detail}`)
if (process.exitCode) throw new Error('GO-04 Phase 1 governance validation failed')
