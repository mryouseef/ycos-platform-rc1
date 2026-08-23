import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanFile } from './ep02-security-rules.mjs';

const root = resolve(import.meta.dirname, '..', 'bicep', 'network');
const files = [
  resolve(root, 'main.bicep'),
  resolve(root, 'modules/application-nsg.bicep'),
  resolve(root, 'modules/controlled-network.bicep'),
  resolve(root, 'params/controlled.bicepparam'),
];

let failures = 0;
for (const file of files) {
  const hits = scanFile(file);
  if (hits.length) {
    failures += hits.length;
    console.error(`FAIL: ${file}: ${hits.join(', ')}`);
  } else {
    console.log(`PASS: ${file}`);
  }
}

const nsg = await import('node:fs').then(({ readFileSync }) => readFileSync(resolve(root, 'modules/application-nsg.bicep'), 'utf8'));
if (!/access:\s*'Deny'/.test(nsg) || !/Deny-Internet-Inbound/.test(nsg) || !/Deny-Internet-Outbound/.test(nsg)) {
  console.error('FAIL: EP02-SEC-012 explicit deny baseline missing');
  failures += 1;
}

if (failures) process.exit(1);
console.log(`EP-02 source security checks passed: ${files.length * 11 + 1}`);
