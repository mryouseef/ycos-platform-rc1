import { resolve } from 'node:path';
import { scanFile } from './ep02-security-rules.mjs';

const fixtures = [
  ['unsafe-broad-nsg.bicep', 'EP02-SEC-005'],
  ['unsafe-public-data-plane.bicep', 'EP02-SEC-003'],
  ['unsafe-hardcoded-secret.bicep', 'EP02-SEC-006'],
  ['unsafe-production-data.bicep', 'EP02-SEC-008'],
  ['unsafe-saudi-region.bicep', 'EP02-SEC-007'],
];

let failures = 0;
for (const [fixture, expected] of fixtures) {
  const hits = scanFile(resolve(import.meta.dirname, 'fixtures/ep02', fixture));
  if (hits.includes(expected)) console.log(`PASS: ${fixture} -> ${expected}`);
  else {
    failures += 1;
    console.error(`FAIL: ${fixture} did not produce ${expected}; got ${hits.join(', ') || 'none'}`);
  }
}

if (failures) process.exit(1);
console.log(`EP-02 negative fixture checks passed: ${fixtures.length}`);
