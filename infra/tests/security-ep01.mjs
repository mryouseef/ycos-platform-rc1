import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceFiles = [
  resolve(root, 'bicep/main.bicep'),
  resolve(root, 'bicep/params/controlled.bicepparam'),
];

const prohibited = [
  ['literal client secret', /clientSecret\s*[:=]\s*['"][^'"]+/i],
  ['literal password', /password\s*[:=]\s*['"][^'"]+/i],
  ['literal private key', /privateKey\s*[:=]\s*['"][^'"]+/i],
  ['literal connection string', /connectionString\s*[:=]\s*['"][^'"]+/i],
  ['hard-coded Saudi production region', /saudi arabia east/i],
  ['real subscription identifier', /subscriptionId\s*[:=]\s*['"][0-9a-f-]{16,}/i],
  ['real tenant identifier', /tenantId\s*[:=]\s*['"][0-9a-f-]{16,}/i],
];

let failures = 0;
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  for (const [name, pattern] of prohibited) {
    if (pattern.test(content)) {
      console.error(`FAIL: ${name} in ${file}`);
      failures += 1;
    }
  }
}

if (failures) process.exit(1);
console.log(`EP-01 local security checks passed: ${prohibited.length * sourceFiles.length}`);
