import { readFile } from 'node:fs/promises';

const fixtures = new Map([
  ['unsafe-cross-client-export.mjs', 'requestedClientId'], ['unsafe-cross-client-deletion.mjs', 'targetClientId'], ['unsafe-cross-client-hold.mjs', 'targetClientId'], ['unsafe-request-forged-client.mjs', 'request.client_id'], ['unsafe-hold-bypass.mjs', 'ignoreHold'], ['unsafe-public-export.mjs', 'public: true'], ['unsafe-export-id-auth.mjs', 'return exportId'], ['unsafe-secret-export.mjs', 'privateKey'], ['unsafe-sensitive-audit.mjs', 'SYNTHETIC_PRIVATE_SENTINEL'], ['unsafe-restore-reactivates.mjs', "lifecycle = 'ACTIVE'"], ['unsafe-restore-drops-hold.mjs', 'holdId = null'], ['unsafe-real-data-fixture.mjs', 'real.person@example.com'], ['unsafe-action-without-audit.mjs', 'skipAudit: true'], ['unsafe-missing-raw-evidence.mjs', 'RAW_EVIDENCE_OPTIONAL']
]);
for (const [file, pattern] of fixtures) { const value = await readFile(`infra/tests/fixtures/ep11/${file}`, 'utf8'); if (!value.includes(pattern)) throw new Error(`FAIL ${file}`); console.log(`PASS ${file}`); }
console.log(`PASS ${fixtures.size} EP-11 negative fixtures detected`);
