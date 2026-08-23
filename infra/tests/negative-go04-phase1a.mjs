import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'infra/tests/fixtures/go04-phase1a');
const fixtures = fs.readdirSync(dir).filter((name) => name.endsWith('.mjs')).sort();
let failed = 0;
for (const fixture of fixtures) {
  const content = fs.readFileSync(path.join(dir, fixture), 'utf8');
  const pass = content.includes('UNSAFE_PHASE1A_');
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${fixture} | ${pass ? 'detected' : 'missing marker'}`);
  if (!pass) failed++;
}
console.log(`SUMMARY | ${fixtures.length - failed}/${fixtures.length} PASS`);
process.exit(failed ? 1 : 0);
