import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const recovery = await read('recovery/ep08/src/backup-recovery-domain.mjs');
const bicep = await read('bicep/network/modules/future-recovery-contract.bicep');
const main = await read('bicep/network/main.bicep');
const checks = [];
const has = (pattern, label) => { assert.match(recovery, pattern, label); checks.push(label); };
const absent = (pattern, label) => { assert.doesNotMatch(recovery, pattern, label); checks.push(label); };

has(/RECOVERY_AUTHORIZATION_DENIED/, 'normal runtime backup or restore denied');
has(/CROSS_CLIENT_RESTORE_DENIED/, 'cross-client restore denied');
has(/CROSS_ENVIRONMENT_RESTORE_DENIED/, 'cross-environment restore denied');
has(/BACKUP_HASH_INVALID/, 'backup hash verification required');
has(/BACKUP_INCOMPLETE/, 'incomplete backup rejected');
has(/POST_RESTORE_VALIDATION_FAILED/, 'recovery cannot complete before validation');
has(/RESTORE_CONCURRENCY_DENIED/, 'unsafe concurrent restore denied');
has(/HOLD_BLOCKED/, 'hold overrides ordinary disposition');
has(/reconcileSecurity/, 'security-state reconciliation exists');
has(/verifyIntegrity\(\).*RecoverySecurityError\(verification\.code\)/, 'audit tamper evidence is preserved');
absent(/process\.env|fetch\(|https?:\/\/|console\.log/, 'no external service, provider credential, or raw logger');
absent(/password=|AccountKey=|BEGIN PRIVATE KEY|SENTINEL_SERVER_SECRET/, 'no credential or secret literal');
assert.match(bicep, /backupVaultConfigured bool = false/); checks.push('no backup vault configured');
assert.match(bicep, /recoveryServiceConfigured bool = false/); checks.push('no recovery service configured');
assert.match(main, /crossRegionPosture: 'same-region-first'/); checks.push('cross-region activation not assumed');
console.log(`EP-08 static security checks passed: ${checks.length}`);
