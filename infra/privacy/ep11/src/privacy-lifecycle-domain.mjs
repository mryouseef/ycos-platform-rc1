import { randomUUID } from 'node:crypto';
import { AuditSecurityError, SyntheticAuditSink } from '../../../audit/ep06/src/audit-domain.mjs';

export class PrivacyLifecycleError extends Error { constructor(code) { super(code); this.code = code; } }

const required = (context, permission) => {
  if (!context?.permissions?.includes(permission)) throw new PrivacyLifecycleError('PRIVACY_AUTHORIZATION_DENIED');
};
const sameClient = (context, record) => {
  if (!context?.clientId || context.clientId !== record.clientId) throw new PrivacyLifecycleError('PRIVACY_RECORD_NOT_FOUND');
};
const safeFields = new Set(['recordId', 'classification', 'purpose', 'displayLabel']);

export class SyntheticPrivacyLifecycleDomain {
  constructor({ now = () => Date.now(), auditSink = new SyntheticAuditSink(), exportLifetimeMs = 60000 } = {}) {
    this.now = now; this.auditSink = auditSink; this.exportLifetimeMs = exportLifetimeMs;
    this.records = new Map(); this.exports = new Map(); this.holds = new Map(); this.tombstones = new Map(); this.lineage = new Map(); this.operations = new Map();
  }
  audit(context, eventType, action, decision, reasonCode, detail = {}) {
    try {
      return this.auditSink.append({ eventType, actor: { actorType: 'user', actorUserId: context.actorUserId, effectiveUserId: context.effectiveUserId ?? context.actorUserId }, clientId: context.clientId, action, decision, reasonCode, correlationId: context.correlationId, sourceComponent: 'ep11-privacy-lifecycle-domain', securityClassification: 'PRIVACY_METADATA_ONLY', detail });
    } catch (error) {
      throw new PrivacyLifecycleError('MANDATORY_AUDIT_UNAVAILABLE');
    }
  }
  createRecord(context, { classification = 'SENSITIVE', purpose = 'synthetic-service', displayLabel = 'synthetic-record', syntheticSensitive = 'SYNTHETIC_PRIVATE_SENTINEL' } = {}) {
    required(context, 'privacy.record.create');
    const recordId = randomUUID(); const record = { recordId, clientId: context.clientId, classification, purpose, displayLabel, syntheticSensitive, lifecycle: 'ACTIVE', retentionPolicy: 'SYNTHETIC_EP11_POLICY', holdId: null, dispositionId: null, synthetic: true };
    this.records.set(recordId, record); this.lineage.set(recordId, { canonicalRecordId: recordId, derived: [], exports: [], recovery: [] });
    this.audit(context, 'privacy.record.classified', 'privacy.record.create', 'ALLOW', 'SYNTHETIC_RECORD_CREATED', { recordId, classification, purpose }); return structuredClone(record);
  }
  viewMinimized(context, recordId) {
    required(context, 'privacy.record.read'); const record = this.record(context, recordId); if (record.lifecycle === 'DISPOSED') throw new PrivacyLifecycleError('RECORD_DISPOSED');
    this.audit(context, 'privacy.minimized_view', 'privacy.record.read', 'ALLOW', 'MINIMIZED_VIEW_AUTHORIZED', { recordId, fields: [...safeFields] });
    return Object.fromEntries(Object.entries(record).filter(([key]) => safeFields.has(key)));
  }
  createHold(context, recordId, { reasonReference } = {}) {
    required(context, 'privacy.hold.manage'); const record = this.record(context, recordId); if (!reasonReference || reasonReference.length < 3) throw new PrivacyLifecycleError('HOLD_REASON_REQUIRED');
    const hold = { holdId: randomUUID(), recordId, clientId: record.clientId, status: 'ACTIVE', reasonReference, createdAt: this.now() }; this.holds.set(hold.holdId, hold); record.holdId = hold.holdId; record.lifecycle = 'HOLD_ACTIVE';
    this.audit(context, 'privacy.hold.created', 'privacy.hold.create', 'ALLOW', 'HOLD_CREATED', { holdId: hold.holdId, recordId }); return structuredClone(hold);
  }
  releaseHold(context, holdId) {
    required(context, 'privacy.hold.release'); const hold = this.holds.get(holdId); if (!hold || hold.clientId !== context.clientId || hold.status !== 'ACTIVE') throw new PrivacyLifecycleError('HOLD_RELEASE_DENIED');
    const record = this.records.get(hold.recordId); hold.status = 'RELEASED'; hold.releasedAt = this.now(); record.holdId = null; record.lifecycle = 'RETENTION_EVALUATED'; this.audit(context, 'privacy.hold.released', 'privacy.hold.release', 'ALLOW', 'HOLD_RELEASED', { holdId, recordId: record.recordId }); return structuredClone(hold);
  }
  requestDisposition(context, recordId, operationId = randomUUID()) {
    required(context, 'privacy.disposition.request'); const record = this.record(context, recordId); if (this.operations.has(operationId)) return structuredClone(this.operations.get(operationId));
    if (record.holdId) { this.audit(context, 'privacy.disposition.denied', 'privacy.disposition.request', 'DENY', 'HOLD_OVERRIDES_DISPOSITION', { recordId }); throw new PrivacyLifecycleError('BLOCKED_BY_HOLD'); }
    const operation = { operationId, recordId, clientId: record.clientId, state: 'AUTHORIZED', createdAt: this.now() }; this.operations.set(operationId, operation); this.audit(context, 'privacy.disposition.authorized', 'privacy.disposition.request', 'ALLOW', 'DISPOSITION_AUTHORIZED', { operationId, recordId }); return structuredClone(operation);
  }
  executeDisposition(context, operationId, { fail = false } = {}) {
    required(context, 'privacy.disposition.execute'); const op = this.operations.get(operationId); const record = op && this.records.get(op.recordId); if (!op || !record || op.clientId !== context.clientId || op.state !== 'AUTHORIZED') throw new PrivacyLifecycleError('DISPOSITION_STATE_DENIED');
    if (record.holdId) { op.state = 'BLOCKED_BY_HOLD'; this.audit(context, 'privacy.disposition.denied', 'privacy.disposition.execute', 'DENY', 'HOLD_OVERRIDES_DISPOSITION', { operationId }); throw new PrivacyLifecycleError('BLOCKED_BY_HOLD'); }
    if (fail) { op.state = 'FAILED'; this.audit(context, 'privacy.disposition.failed', 'privacy.disposition.execute', 'DENY', 'SYNTHETIC_DISPOSITION_FAILURE', { operationId }); throw new PrivacyLifecycleError('DISPOSITION_FAILED'); }
    this.audit(context, 'privacy.disposition.executing', 'privacy.disposition.execute', 'ALLOW', 'DISPOSITION_EXECUTING', { operationId, recordId: record.recordId });
    record.lifecycle = 'DISPOSED'; record.dispositionId = operationId; record.syntheticSensitive = '[DISPOSED]'; this.tombstones.set(record.recordId, { recordId: record.recordId, clientId: record.clientId, disposedAt: this.now(), dispositionId: operationId }); op.state = 'DISPOSED';
    this.audit(context, 'privacy.disposition.completed', 'privacy.disposition.execute', 'ALLOW', 'DISPOSITION_COMPLETED', { operationId, recordId: record.recordId }); return structuredClone(op);
  }
  requestExport(context, recordId, { purpose, operationId = randomUUID() } = {}) {
    required(context, 'privacy.export.request'); const record = this.record(context, recordId); if (!purpose || purpose.length < 3 || record.lifecycle === 'DISPOSED') throw new PrivacyLifecycleError('EXPORT_REQUEST_DENIED');
    this.audit(context, 'privacy.export.requested', 'privacy.export.request', 'ALLOW', 'EXPORT_REQUESTED', { operationId, recordId, purpose });
    const exportRecord = { exportId: randomUUID(), operationId, recordId, clientId: record.clientId, state: 'REQUESTED', purpose, objectKey: `privacy-export-${randomUUID().replaceAll('-', '')}`, expiresAt: null, revoked: false }; this.exports.set(exportRecord.exportId, exportRecord); return structuredClone(exportRecord);
  }
  authorizeExport(context, exportId) {
    required(context, 'privacy.export.authorize'); const item = this.exportRecord(context, exportId); if (item.state !== 'REQUESTED') throw new PrivacyLifecycleError('EXPORT_STATE_DENIED'); item.state = 'AUTHORIZED'; this.audit(context, 'privacy.export.authorized', 'privacy.export.authorize', 'ALLOW', 'EXPORT_AUTHORIZED', { exportId, recordId: item.recordId }); return structuredClone(item);
  }
  generateExport(context, exportId) {
    required(context, 'privacy.export.generate'); const item = this.exportRecord(context, exportId); if (item.state !== 'AUTHORIZED') throw new PrivacyLifecycleError('EXPORT_STATE_DENIED'); const record = this.records.get(item.recordId); item.state = 'READY'; item.expiresAt = this.now() + this.exportLifetimeMs; item.payload = this.viewMinimized(context, record.recordId); this.lineage.get(record.recordId).exports.push(item.exportId); this.audit(context, 'privacy.export.ready', 'privacy.export.generate', 'ALLOW', 'EXPORT_PRIVATE_READY', { exportId, recordId: item.recordId, expiresAt: item.expiresAt }); return { exportId: item.exportId, objectKey: item.objectKey, state: item.state };
  }
  readExport(context, exportId) {
    required(context, 'privacy.export.read'); const item = this.exportRecord(context, exportId); if (item.state !== 'READY' || item.revoked || item.expiresAt <= this.now()) throw new PrivacyLifecycleError('EXPORT_ACCESS_DENIED'); this.audit(context, 'privacy.export.accessed', 'privacy.export.read', 'ALLOW', 'EXPORT_ACCESS_AUTHORIZED', { exportId }); return structuredClone(item.payload);
  }
  revokeExport(context, exportId) { required(context, 'privacy.export.revoke'); const item = this.exportRecord(context, exportId); item.revoked = true; item.state = 'REVOKED'; this.audit(context, 'privacy.export.revoked', 'privacy.export.revoke', 'ALLOW', 'EXPORT_REVOKED', { exportId }); }
  redact(context, recordId) { required(context, 'privacy.redaction.execute'); const record = this.record(context, recordId); const view = this.viewMinimized(context, recordId); this.audit(context, 'privacy.redaction.completed', 'privacy.redaction.execute', 'ALLOW', 'REDACTION_COMPLETED', { recordId }); return { ...view, syntheticSensitive: '[REDACTED]' }; }
  reconcileRestored(context, restoredRecord) {
    required(context, 'privacy.reconcile.execute'); const tombstone = this.tombstones.get(restoredRecord.recordId); const activeHold = [...this.holds.values()].find((hold) => hold.recordId === restoredRecord.recordId && hold.status === 'ACTIVE');
    const result = { ...restoredRecord, lifecycle: tombstone ? 'DISPOSED' : activeHold ? 'HOLD_ACTIVE' : restoredRecord.lifecycle, holdId: activeHold?.holdId ?? null, reconciled: true }; this.audit(context, 'privacy.restore.reconciled', 'privacy.reconcile.execute', 'ALLOW', 'RESTORE_RECONCILED', { recordId: restoredRecord.recordId, tombstone: Boolean(tombstone), hold: Boolean(activeHold) }); return result;
  }
  record(context, recordId) { const record = this.records.get(recordId); if (!record) throw new PrivacyLifecycleError('PRIVACY_RECORD_NOT_FOUND'); sameClient(context, record); return record; }
  exportRecord(context, exportId) { const item = this.exports.get(exportId); if (!item || item.clientId !== context.clientId) throw new PrivacyLifecycleError('EXPORT_NOT_FOUND'); return item; }
}
