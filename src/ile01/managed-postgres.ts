/** ILE-01 deployment adapter: server-only managed PostgreSQL path; canonical PN/IAF contracts remain unchanged. */
import { createRequire } from 'node:module'
import type { WorkItem } from '../pn02/core'
import type { SecurityContext } from '../pn01/contracts'

const require = createRequire(import.meta.url)
const { Pool } = require('pg') as { Pool: new (options: Record<string, unknown>) => any }

export type ProviderMembershipRecord = Readonly<{
  user: Readonly<{ id: string; providerIssuer: string; providerSubject: string; status: 'ACTIVE' | 'DISABLED' }>
  memberships: readonly Readonly<{ id: string; userId: string; organizationId: string; roleCode: string; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'; authorityVersion: number }>[]
  organizations: Readonly<Record<string, Readonly<{ id: string; status: 'ACTIVE' | 'SUSPENDED' }>>>
}>

export class IleManagedPostgresWorkItemRepository {
  private pool: any
  constructor(url: string, allowInsecureTest = false) {
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) throw new Error('IntegrityFailure')
    if (!allowInsecureTest && !/sslmode=(require|verify-ca|verify-full)/.test(url)) throw new Error('IntegrityFailure')
    this.pool = new Pool({ connectionString: url, ssl: allowInsecureTest ? false : { rejectUnauthorized: true }, max: 4 })
  }
  private async transaction<T>(tenantId: string, actorId: string | null, operation: (client: any) => Promise<T>): Promise<T> {
    if (!/^[A-Za-z0-9_-]+$/.test(tenantId)) throw new Error('IntegrityFailure')
    if (actorId !== null && !/^[A-Za-z0-9_-]+$/.test(actorId)) throw new Error('IntegrityFailure')
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const role = await client.query('SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user')
      if (role.rows[0]?.rolbypassrls !== false) throw new Error('IntegrityFailure')
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
      if (actorId !== null) await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId])
      const context = await client.query("SELECT current_setting('app.tenant_id', true) AS tenant")
      if (context.rows[0]?.tenant !== tenantId) throw new Error('IntegrityFailure')
      if (actorId !== null) {
        const actor = await client.query("SELECT current_setting('app.actor_id', true) AS actor")
        if (actor.rows[0]?.actor !== actorId) throw new Error('IntegrityFailure')
      }
      const result = await operation(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      if (error instanceof Error && ['NotFound', 'ConcurrencyFailure', 'IntegrityFailure'].includes(error.message)) throw error
      throw new Error('IntegrityFailure')
    } finally { client.release() }
  }
  async get(tenantId: string, id: string): Promise<WorkItem> {
    return this.transaction(tenantId, null, async (client) => {
      const result = await client.query('SELECT id, tenant_id, state, version, classification FROM work_items WHERE id = $1', [id])
      if (result.rowCount !== 1) throw new Error('NotFound')
      const row = result.rows[0]
      return { id: row.id, tenantId: row.tenant_id, state: row.state, version: Number(row.version), classification: row.classification }
    })
  }
  async save(item: WorkItem, expectedVersion?: number): Promise<void> {
    if (typeof expectedVersion !== 'number') throw new Error('IntegrityFailure')
    await this.transaction(item.tenantId, null, async (client) => {
      const result = await client.query('UPDATE work_items SET state = $1, version = $2 WHERE id = $3 AND version = $4 RETURNING version', [item.state, item.version, item.id, expectedVersion])
      if (result.rowCount !== 1) throw new Error('ConcurrencyFailure')
    })
  }
  async getWithSecurityContext(context: SecurityContext, id: string): Promise<WorkItem> {
    if (!context.actorId || !context.tenantId || context.dataScope !== 'synthetic') throw new Error('IntegrityFailure')
    return this.transaction(context.tenantId, context.actorId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, state, version, classification FROM work_items WHERE id = $1', [id])
      if (result.rowCount !== 1) throw new Error('NotFound')
      const row = result.rows[0]
      return { id: row.id, tenantId: row.tenant_id, state: row.state, version: Number(row.version), classification: row.classification }
    })
  }
  async providerMembership(providerIssuer: string, providerSubject: string): Promise<ProviderMembershipRecord | undefined> {
    if (!providerIssuer || !providerSubject) throw new Error('AuthenticationRequired')
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const role = await client.query('SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user')
      if (role.rows[0]?.rolbypassrls !== false) throw new Error('IntegrityFailure')
      await client.query("SELECT set_config('app.provider_issuer', $1, true)", [providerIssuer])
      await client.query("SELECT set_config('app.provider_subject', $1, true)", [providerSubject])
      const userResult = await client.query('SELECT id, provider_issuer, provider_subject, status FROM public.users WHERE provider_issuer = $1 AND provider_subject = $2', [providerIssuer, providerSubject])
      if (userResult.rowCount !== 1) { await client.query('COMMIT'); return undefined }
      const userRow = userResult.rows[0]
      const user = { id: String(userRow.id), providerIssuer: String(userRow.provider_issuer), providerSubject: String(userRow.provider_subject), status: userRow.status as 'ACTIVE' | 'DISABLED' }
      await client.query("SELECT set_config('app.actor_id', $1, true)", [user.id])
      const membershipResult = await client.query('SELECT id, user_id, organization_id, role_code, status, authority_version FROM public.organization_memberships WHERE user_id = $1', [user.id])
      const memberships: Array<ProviderMembershipRecord['memberships'][number]> = membershipResult.rows.map((row: any) => ({ id: String(row.id), userId: String(row.user_id), organizationId: String(row.organization_id), roleCode: String(row.role_code), status: row.status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED', authorityVersion: Number(row.authority_version) }))
      const organizations: Record<string, { id: string; status: 'ACTIVE' | 'SUSPENDED' }> = {}
      for (const organizationId of memberships.filter((membership) => membership.status === 'ACTIVE').map((membership) => membership.organizationId)) {
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [organizationId])
        const organizationResult = await client.query('SELECT id, status FROM public.organizations WHERE id = $1', [organizationId])
        if (organizationResult.rowCount === 1) organizations[organizationId] = { id: String(organizationResult.rows[0].id), status: organizationResult.rows[0].status as 'ACTIVE' | 'SUSPENDED' }
      }
      await client.query('COMMIT')
      return { user, memberships, organizations }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      if (error instanceof Error && ['AuthenticationRequired', 'IntegrityFailure'].includes(error.message)) throw error
      throw new Error('IntegrityFailure')
    } finally { client.release() }
  }
  async close() { await this.pool.end() }
}
