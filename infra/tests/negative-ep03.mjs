import { resolve } from 'node:path';
import { read, scanBicepFixture, scanSqlFixture } from './ep03-security-rules.mjs';

const base = resolve(import.meta.dirname, 'fixtures/ep03');
const fixtures = [
  ['unsafe-rls-disabled.sql', 'EP03-NEG-001', scanSqlFixture],
  ['unsafe-force-absent.sql', 'EP03-NEG-002', scanSqlFixture],
  ['unsafe-bypass-role.sql', 'EP03-NEG-003', scanSqlFixture],
  ['unsafe-policy.sql', 'EP03-NEG-004', scanSqlFixture],
  ['unsafe-session-context.sql', 'EP03-NEG-005', scanSqlFixture],
  ['unsafe-broad-db-network.bicep', 'EP03-NEG-006', scanBicepFixture],
  ['unsafe-ownership-mutation.sql', 'EP03-NEG-007', scanSqlFixture],
  ['unsafe-public-postgres.bicep', 'EP03-NEG-008', scanBicepFixture],
];

let failures = 0;
for (const [fixture, expected, scanner] of fixtures) {
  const hits = scanner(read(resolve(base, fixture)));
  if (hits.includes(expected)) console.log(`PASS: ${fixture} -> ${expected}`);
  else {
    failures += 1;
    console.error(`FAIL: ${fixture} did not produce ${expected}; got ${hits.join(', ') || 'none'}`);
  }
}
if (failures) process.exit(1);
console.log(`EP-03 negative fixture checks passed: ${fixtures.length}`);
