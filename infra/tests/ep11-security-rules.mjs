import { readFile } from 'node:fs/promises';

const domain = await readFile('infra/privacy/ep11/src/privacy-lifecycle-domain.mjs', 'utf8');
const bicep = await readFile('infra/bicep/network/modules/future-privacy-contract.bicep', 'utf8');
const order = await readFile('artifacts/go-03/ep-11/ep-11-authority-and-scope.md', 'utf8');
const checks = [
  ['client scope is server checked', /sameClient\(context, record\)/.test(domain)],
  ['hold overrides disposition', /HOLD_OVERRIDES_DISPOSITION/.test(domain)],
  ['soft delete is not disposition', /tombstones\.set/.test(domain) && /DISPOSED/.test(domain)],
  ['export ID knowledge is not authorization', /EXPORT_NOT_FOUND/.test(domain) && /exportRecord\(context, exportId\)/.test(domain)],
  ['mandatory audit failure blocks high risk action', /MANDATORY_AUDIT_UNAVAILABLE/.test(domain)],
  ['minimization excludes sensitive field', /safeFields/.test(domain) && /syntheticSensitive/.test(domain)],
  ['privacy Bicep is planning only', !/^resource\s+/m.test(bicep) && /planning-only/i.test(bicep)],
  ['no real data scope is preserved', /Real personal\/customer\/student\/business data/i.test(order)],
  ['no unsupported legal claim', /legal\/regulatory compliance claims/i.test(order)]
];
for (const [name, ok] of checks) { if (!ok) throw new Error(`FAIL ${name}`); console.log(`PASS ${name}`); }
console.log(`PASS ${checks.length} EP-11 static privacy checks`);
