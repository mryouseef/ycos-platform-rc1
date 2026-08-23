import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const main = readFileSync(resolve(root, 'bicep/main.bicep'), 'utf8');
const params = readFileSync(resolve(root, 'bicep/params/controlled.bicepparam'), 'utf8');
const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8');

const checks = [
  ['subscription target scope', /targetScope = 'subscription'/],
  ['controlled-only environment', /'controlled'/],
  ['parameterized evaluation region', /param authorizedControlledEvaluationRegion string/],
  ['resource-group tag model', /var requiredTags = \{/],
  ['synthetic classification guard', /'synthetic-non-sensitive'/],
  ['region placeholder is non-authoritative', /authorizedControlledEvaluationRegion = 'regionx'/],
  ['no hard-coded Saudi production region', !/saudi arabia east/i.test(main)],
  ['no Azure credential value', !/(clientSecret|password|privateKey)\s*[:=]\s*['"][^'"]+/i.test(main)],
  ['state files ignored', /\*\.tfstate/.test(ignore)],
  ['private-key files ignored', /\*\.key/.test(ignore)],
];

let failures = 0;
for (const [name, result] of checks) {
  if (result) {
    console.log(`PASS: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}`);
  }
}

if (failures) process.exit(1);
console.log(`EP-01 source guard checks passed: ${checks.length}`);
