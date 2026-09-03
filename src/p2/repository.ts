/** P2 deployment adapter: server-only managed PostgreSQL path, mirrors src/ile01/managed-postgres.ts's
 * transaction discipline exactly (session-local app.tenant_id/app.actor_id, rolbypassrls guard,
 * round-trip verification, no privileged bypass). Talks only to the P2 additive tables plus the
 * single narrow SECURITY DEFINER eligibility function added in migration 002 (P2-R01A).
 *
 * R01/R01A corrections in this file:
 * - Every successful mutation now inserts its audit row inside the SAME transaction as the
 *   mutation itself (no separate appendAudit() call after commit) — see each method below.
 * - assignConsultant() now calls public.p2_is_consultant_membership_eligible(...) — a boolean-only
 *   SECURITY DEFINER function — instead of trusting the caller-supplied id's string format alone.
 */
import { createRequire } from 'node:module'
import type { ConsultingRequest, Consultation, RequestState, ConsultationState } from './domain'

const require = createRequire(import.meta.url)
const { Pool } = require('pg') as { Pool: new (options: Record<string, unknown>) => any }

export type P2AuditInput = Readonly<{
  actorId: string
  action: string
  resourceType: 'request' | 'consultation'
  resourceId: string
  outcome: 'ALLOW' | 'DENY' | 'CONFLICT'
  reasonCode?: string
  correlationId: string
  previousState?: string
  requestedState?: string
}>

export class P2PostgresRepository {
  private pool: any
  constructor(url: string, allowInsecureTest = false) {
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) throw new Error('IntegrityFailure')
    if (!allowInsecureTest && !/sslmode=(require|verify-ca|verify-full)/.test(url)) throw new Error('IntegrityFailure')
    this.pool = new Pool({ connectionString: url, ssl: allowInsecureTest ? false : { rejectUnauthorized: true }, max: 4 })
  }

  private async transaction<T>(tenantId: string, actorId: string, operation: (client: any) => Promise<T>): Promise<T> {
    if (!/^[A-Za-z0-9_-]+$/.test(tenantId)) throw new Error('IntegrityFailure')
    if (!/^[A-Za-z0-9_-]+$/.test(actorId)) throw new Error('IntegrityFailure')
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const role = await client.query('SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user')
      if (role.rows[0]?.rolbypassrls !== false) throw new Error('IntegrityFailure')
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
      await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId])
      const context = await client.query("SELECT current_setting('app.tenant_id', true) AS tenant, current_setting('app.actor_id', true) AS actor")
      if (context.rows[0]?.tenant !== tenantId || context.rows[0]?.actor !== actorId) throw new Error('IntegrityFailure')
      const result = await operation(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      if (error instanceof Error && ['NotFound', 'ConcurrencyFailure', 'IntegrityFailure', 'ALREADY_ESTABLISHED', 'ASSIGNEE_NOT_ELIGIBLE'].includes(error.message)) throw error
      throw new Error('IntegrityFailure')
    } finally { client.release() }
  }

  /** Inserts the audit row for the SAME resource mutation, on the SAME client/transaction —
   * never a separate BEGIN/COMMIT. This is the R01 audit-atomicity correction. */
  private static async audit(client: any, tenantId: string, input: P2AuditInput): Promise<void> {
    await client.query(
      `INSERT INTO p2_audit_events (id, tenant_id, actor_id, action, resource_type, resource_id, outcome, reason_code, correlation_id, previous_state, requested_state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [`aud-${input.correlationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tenantId, input.actorId, input.action, input.resourceType, input.resourceId, input.outcome, input.reasonCode ?? null, input.correlationId, input.previousState ?? null, input.requestedState ?? null],
    )
  }

  private static mapRequest(row: any): ConsultingRequest {
    return { id: row.id, tenantId: row.tenant_id, ownerMembershipId: row.owner_membership_id, title: row.title, summary: row.summary, state: row.state as RequestState, version: Number(row.version), classification: 'synthetic' }
  }

  private static mapConsultation(row: any): Consultation {
    return { id: row.id, tenantId: row.tenant_id, requestId: row.request_id, managerMembershipId: row.manager_membership_id, consultantMembershipId: row.consultant_membership_id ?? null, state: row.state as ConsultationState, version: Number(row.version) }
  }

  /** ON CONFLICT DO NOTHING on (tenant_id, idempotency_key) is the structural replay guard for P2-A.
   * The audit row is inserted in the same transaction whether the row is new or a replay hit. */
  async createRequest(tenantId: string, actorId: string, input: { id: string; ownerMembershipId: string; title: string; summary: string; idempotencyKey: string; correlationId: string }): Promise<{ duplicate: boolean; request: ConsultingRequest }> {
    return this.transaction(tenantId, actorId, async (client) => {
      const existing = await client.query('SELECT id, tenant_id, owner_membership_id, title, summary, state, version FROM consulting_requests WHERE tenant_id = $1 AND idempotency_key = $2', [tenantId, input.idempotencyKey])
      if (existing.rowCount === 1) {
        const request = P2PostgresRepository.mapRequest(existing.rows[0])
        await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'CREATE', resourceType: 'request', resourceId: request.id, outcome: 'ALLOW', reasonCode: 'REPLAY', correlationId: input.correlationId, requestedState: request.state })
        return { duplicate: true, request }
      }
      const inserted = await client.query(
        `INSERT INTO consulting_requests (id, tenant_id, owner_membership_id, title, summary, state, version, classification, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,'DRAFT',1,'synthetic',$6)
         RETURNING id, tenant_id, owner_membership_id, title, summary, state, version`,
        [input.id, tenantId, input.ownerMembershipId, input.title, input.summary, input.idempotencyKey],
      )
      const request = P2PostgresRepository.mapRequest(inserted.rows[0])
      await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'CREATE', resourceType: 'request', resourceId: request.id, outcome: 'ALLOW', correlationId: input.correlationId, requestedState: request.state })
      return { duplicate: false, request }
    })
  }

  async getRequest(tenantId: string, actorId: string, id: string): Promise<ConsultingRequest> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, owner_membership_id, title, summary, state, version FROM consulting_requests WHERE tenant_id = $1 AND id = $2', [tenantId, id])
      if (result.rowCount !== 1) throw new Error('NotFound')
      return P2PostgresRepository.mapRequest(result.rows[0])
    })
  }

  async listRequests(tenantId: string, actorId: string, ownerMembershipId?: string): Promise<ConsultingRequest[]> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = ownerMembershipId
        ? await client.query('SELECT id, tenant_id, owner_membership_id, title, summary, state, version FROM consulting_requests WHERE tenant_id = $1 AND owner_membership_id = $2 ORDER BY created_at DESC', [tenantId, ownerMembershipId])
        : await client.query('SELECT id, tenant_id, owner_membership_id, title, summary, state, version FROM consulting_requests WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId])
      return result.rows.map(P2PostgresRepository.mapRequest)
    })
  }

  async listConsultationsForConsultant(tenantId: string, actorId: string, consultantMembershipId: string): Promise<Consultation[]> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version FROM consultations WHERE tenant_id = $1 AND consultant_membership_id = $2 ORDER BY created_at DESC', [tenantId, consultantMembershipId])
      return result.rows.map(P2PostgresRepository.mapConsultation)
    })
  }

  async transitionRequest(tenantId: string, actorId: string, id: string, expectedVersion: number, target: RequestState, correlationId: string, previousState: string): Promise<ConsultingRequest> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query(
        `UPDATE consulting_requests SET state = $1, version = version + 1, updated_at = now()
         WHERE tenant_id = $2 AND id = $3 AND version = $4
         RETURNING id, tenant_id, owner_membership_id, title, summary, state, version`,
        [target, tenantId, id, expectedVersion],
      )
      if (result.rowCount !== 1) throw new Error('ConcurrencyFailure')
      const request = P2PostgresRepository.mapRequest(result.rows[0])
      await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'TRANSITION', resourceType: 'request', resourceId: id, outcome: 'ALLOW', correlationId, previousState, requestedState: target })
      return request
    })
  }

  /** UNIQUE(tenant_id, request_id) is the structural replay guard for P2-E: a second establishment
   * attempt for the same request hits this constraint and is reported as ALREADY_ESTABLISHED,
   * never as a second row. On conflict, NO audit row is written here for a fabricated success —
   * the caller (service.ts) records the CONFLICT audit itself after this method throws. */
  async establishConsultation(tenantId: string, actorId: string, input: { id: string; requestId: string; managerMembershipId: string; correlationId: string }): Promise<Consultation> {
    return this.transaction(tenantId, actorId, async (client) => {
      try {
        const inserted = await client.query(
          `INSERT INTO consultations (id, tenant_id, request_id, manager_membership_id, state, version)
           VALUES ($1,$2,$3,$4,'PROPOSED',1)
           RETURNING id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version`,
          [input.id, tenantId, input.requestId, input.managerMembershipId],
        )
        const consultation = P2PostgresRepository.mapConsultation(inserted.rows[0])
        await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'ESTABLISH', resourceType: 'consultation', resourceId: consultation.id, outcome: 'ALLOW', correlationId: input.correlationId, requestedState: consultation.state })
        return consultation
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505') throw new Error('ALREADY_ESTABLISHED')
        throw error
      }
    })
  }

  async getConsultation(tenantId: string, actorId: string, id: string): Promise<Consultation> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version FROM consultations WHERE tenant_id = $1 AND id = $2', [tenantId, id])
      if (result.rowCount !== 1) throw new Error('NotFound')
      return P2PostgresRepository.mapConsultation(result.rows[0])
    })
  }

  /** P3-A: minimum additional read needed for the client request-owner status view.
   * Tenant-scoped via the WHERE clause AND the enclosing transaction's RLS context — a
   * cross-tenant request_id simply matches zero rows (NotFound), never leaking existence. */
  /** P3-B: minimum read primitive for the client-facing lifecycle timeline. Preserves the R01
   * pairing between resource_type and resource_id explicitly in the WHERE clause (never relies
   * on identifier non-collision). R02: REPLAY exclusion is now fully in SQL via
   * `reason_code IS DISTINCT FROM 'REPLAY'` — reason_code is no longer selected at all, so
   * there is nothing to filter or discard in TypeScript. The `id` column is used solely for
   * the ORDER BY tie-breaker (occurred_at is not guaranteed unique) and is never selected. */
  async getClientSafeAuditEvents(tenantId: string, actorId: string, requestId: string, consultationId: string | null): Promise<Array<{ action: string; requestedState: string | null; occurredAt: string }>> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = consultationId
        ? await client.query(
            `SELECT action, requested_state, occurred_at FROM p2_audit_events
             WHERE tenant_id = $1
               AND ((resource_type = 'request' AND resource_id = $2) OR (resource_type = 'consultation' AND resource_id = $3))
               AND outcome = 'ALLOW' AND action != 'ASSIGN' AND reason_code IS DISTINCT FROM 'REPLAY'
             ORDER BY occurred_at ASC, id ASC`,
            [tenantId, requestId, consultationId],
          )
        : await client.query(
            `SELECT action, requested_state, occurred_at FROM p2_audit_events
             WHERE tenant_id = $1 AND resource_type = 'request' AND resource_id = $2
               AND outcome = 'ALLOW' AND action != 'ASSIGN' AND reason_code IS DISTINCT FROM 'REPLAY'
             ORDER BY occurred_at ASC, id ASC`,
            [tenantId, requestId],
          )
      return result.rows.map((row: any) => ({ action: row.action as string, requestedState: (row.requested_state as string | null) ?? null, occurredAt: new Date(row.occurred_at).toISOString() }))
    })
  }

  async getConsultationByRequestId(tenantId: string, actorId: string, requestId: string): Promise<Consultation> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version FROM consultations WHERE tenant_id = $1 AND request_id = $2', [tenantId, requestId])
      if (result.rowCount !== 1) throw new Error('NotFound')
      return P2PostgresRepository.mapConsultation(result.rows[0])
    })
  }

  /** R01A: eligibility is verified via the narrow SECURITY DEFINER boolean function in the SAME
   * transaction as the assignment UPDATE, before it runs. On ineligibility, the whole transaction
   * rolls back — no partial mutation, no fabricated ALLOW audit. The caller records the DENY
   * audit itself, in its own short transaction, after this method throws. */
  async assignConsultant(tenantId: string, actorId: string, id: string, expectedVersion: number, consultantMembershipId: string, correlationId: string): Promise<Consultation> {
    return this.transaction(tenantId, actorId, async (client) => {
      // R01B: the primitive takes ONLY the target id — tenant/actor are never passed as
      // arguments; the function derives them itself from the already-established,
      // already-round-trip-verified app.tenant_id / app.actor_id session GUCs above.
      const eligibility = await client.query('SELECT public.p2_is_consultant_membership_eligible($1) AS eligible', [consultantMembershipId])
      if (eligibility.rows[0]?.eligible !== true) throw new Error('ASSIGNEE_NOT_ELIGIBLE')
      const result = await client.query(
        `UPDATE consultations SET consultant_membership_id = $1, version = version + 1, updated_at = now()
         WHERE tenant_id = $2 AND id = $3 AND version = $4
         RETURNING id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version`,
        [consultantMembershipId, tenantId, id, expectedVersion],
      )
      if (result.rowCount !== 1) throw new Error('ConcurrencyFailure')
      const consultation = P2PostgresRepository.mapConsultation(result.rows[0])
      await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'ASSIGN', resourceType: 'consultation', resourceId: id, outcome: 'ALLOW', correlationId })
      return consultation
    })
  }

  async transitionConsultation(tenantId: string, actorId: string, id: string, expectedVersion: number, target: ConsultationState, correlationId: string, previousState: string): Promise<Consultation> {
    return this.transaction(tenantId, actorId, async (client) => {
      const result = await client.query(
        `UPDATE consultations SET state = $1, version = version + 1, updated_at = now()
         WHERE tenant_id = $2 AND id = $3 AND version = $4
         RETURNING id, tenant_id, request_id, manager_membership_id, consultant_membership_id, state, version`,
        [target, tenantId, id, expectedVersion],
      )
      if (result.rowCount !== 1) throw new Error('ConcurrencyFailure')
      const consultation = P2PostgresRepository.mapConsultation(result.rows[0])
      await P2PostgresRepository.audit(client, tenantId, { actorId, action: 'TRANSITION', resourceType: 'consultation', resourceId: id, outcome: 'ALLOW', correlationId, previousState, requestedState: target })
      return consultation
    })
  }

  /** Used ONLY for DENY/CONFLICT audit entries, which by definition record that NO mutation
   * occurred. This is the one deliberate, documented remaining non-atomicity: a DENY audit row
   * is never lost, but it cannot be "atomic with a mutation" because there is no mutation in a
   * DENY case — there is nothing for it to be atomic with. */
  async appendDenialAudit(tenantId: string, actorId: string, input: P2AuditInput): Promise<void> {
    await this.transaction(tenantId, actorId, async (client) => {
      await P2PostgresRepository.audit(client, tenantId, input)
    })
  }

  async close(): Promise<void> { await this.pool.end() }
}
