import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'artifacts/go-04/phase-1a');
const read = (name) => fs.readFileSync(path.join(base, name), 'utf8');
const source = read('go-04-p1a-source-register.md');
const decision = read('go-04-p1a-final-decision.md');
const matrix = read('go-04-p1a-saudi-service-sku-completeness-matrix.md');
const checks = [
  ['source metadata', (source.match(/\| P1A-S-/g) ?? []).length >= 15 && source.includes('Limitation')],
  ['availability not eligibility', decision.includes('NOT APPROVED') && source.includes('not a provider approval')],
  ['region not complete matrix', matrix.includes('NOT VERIFIED')],
  ['residency not transfer approval', read('go-04-p1a-transfer-path-analysis.md').includes('No path is classified approved')],
  ['dpa not acceptance', read('go-04-p1a-contract-dpa-analysis.md').includes('do not establish')],
  ['f-p1-01 open', read('go-04-p1a-f-p1-01-closure-analysis.md').includes('OPEN')],
  ['f-p1-02 open', read('go-04-p1a-f-p1-02-closure-analysis.md').includes('OPEN')],
  ['f-go02-01 open', read('go-04-p1a-f-go02-01-closure-analysis.md').includes('OPEN')],
  ['m14 retained', read('go-04-p1a-m14-impact-analysis.md').includes('0 CLOSED / 6 OPEN')],
  ['ep09 retained', read('go-04-p1a-f-m11-analysis.md').includes('OPEN / CARRIED')],
  ['no provider selection', decision.includes('Preferred production qualification target / provider approved:** `NONE / NO`')],
  ['no real authority', decision.includes('NO / NO / NO / NOT AUTHORIZED / 0 / NOT AUTHORIZED')],
  ['no phase2', decision.includes('**Phase 2:** `NOT AUTHORIZED`')],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}`); if (!pass) failed++; }
console.log(`SUMMARY | ${checks.length - failed}/${checks.length} PASS`);
process.exit(failed ? 1 : 0);
