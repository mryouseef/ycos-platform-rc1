import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const fixtures = join(root, 'infra/tests/fixtures/go04-phase1')
const rules = [
  ['unsafe-provider-selected.mjs', /PROVIDER SELECTED/, 'P1-N-01'],
  ['unsafe-provider-approved.mjs', /PROVIDER ELIGIBILITY:\s*APPROVED/, 'P1-N-02'],
  ['unsafe-real-data.mjs', /REAL DATA:\s*AUTHORIZED/, 'P1-N-03'],
  ['unsafe-real-identity.mjs', /REAL IDENTITY:\s*AUTHORIZED/, 'P1-N-04'],
  ['unsafe-real-secret.mjs', /REAL SECRETS:\s*AUTHORIZED/, 'P1-N-05'],
  ['unsafe-ai-enabled.mjs', /AI:\s*ENABLED/, 'P1-N-06'],
  ['unsafe-phase2-auto.mjs', /PHASE 2:\s*AUTHORIZED/, 'P1-N-07'],
  ['unsafe-deployment.mjs', /DEPLOYMENT:\s*AUTHORIZED/, 'P1-N-08'],
  ['unsafe-m14-close.mjs', /M-14 BLOCKERS:\s*6 CLOSED/, 'P1-N-09'],
  ['unsafe-finding-close.mjs', /F-GO02-01:\s*CLOSED/, 'P1-N-10'],
  ['unsafe-residency-inference.mjs', /REGION = LEGAL RESIDENCY APPROVAL/, 'P1-N-11'],
  ['unsafe-transfer-inference.mjs', /REGION = TRANSFER APPROVAL/, 'P1-N-12'],
  ['unsafe-source-missing.mjs', /CLAIM WITHOUT SOURCE/, 'P1-N-13'],
  ['unsafe-legal-claim.mjs', /LEGAL COMPLIANCE CONFIRMED/, 'P1-N-14'],
  ['unsafe-azure-resource.mjs', /resource .*Microsoft\./, 'P1-N-15']
]
let failed = false
for (const [file, matcher, code] of rules) {
  const path = join(fixtures, file)
  const content = readFileSync(path, 'utf8')
  const detected = matcher.test(content)
  console.log(`${detected ? 'PASS' : 'FAIL'} ${code} ${file}`)
  if (!detected) failed = true
}
const expected = new Set(rules.map(([file]) => file))
const unexpected = readdirSync(fixtures).filter((file) => !expected.has(file))
console.log(`PASS P1-N-16 fixture inventory: ${rules.length} expected / ${unexpected.length} unexpected`)
if (unexpected.length || failed) throw new Error('GO-04 Phase 1 negative validation failed')
