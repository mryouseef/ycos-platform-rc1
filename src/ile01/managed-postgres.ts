/** ILE-01 deployment adapter: server-only managed PostgreSQL path; canonical PN/IAF contracts remain unchanged. */
import { createRequire } from 'node:module'
import type { WorkItem } from '../pn02/core'

const require = createRequire(import.meta.url)
const { Pool } = require('pg') as { Pool: new (options: Record<string, unknown>) => any }

export class IleManagedPostgresWorkItemRepository {
  private pool: any
  constructor(url: string, allowInsecureTest = false) {
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) throw new Error('IntegrityFailure')
    if (!allowInsecureTest && !/sslmode=(require|verify-ca|verify-full)/.test(url)) throw new Error('IntegrityFailure')
    this.pool = new Pool({ connectionString: url, ssl: allowInsecureTest ? false : { rejectUnauthorized: true }, max: 4 })
  }
  private async transaction<T>(tenantId: string, operation: (client: any) => Promise<T>): Promise<T> {
    if (!/^[A-Z0-9_]+$/.test(tenantId)) throw new Error('IntegrityFailure')
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const role = await client.query('SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user')
      if (role.rows[0]?.rolbypassrls !== false) throw new Error('IntegrityFailure')
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
      const context = await client.query("SELECT current_setting('app.tenant_id', true) AS tenant")
      if (context.rows[0]?.tenant !== tenantId) throw new Error('IntegrityFailure')
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
    return this.transaction(tenantId, async (client) => {
      const result = await client.query('SELECT id, tenant_id, state, version, classification FROM work_items WHERE id = $1', [id])
      if (result.rowCount !== 1) throw new Error('NotFound')
      const row = result.rows[0]
      return { id: row.id, tenantId: row.tenant_id, state: row.state, version: Number(row.version), classification: row.classification }
    })
  }
  async save(item: WorkItem, expectedVersion?: number): Promise<void> {
    if (typeof expectedVersion !== 'number') throw new Error('IntegrityFailure')
    await this.transaction(item.tenantId, async (client) => {
      const result = await client.query('UPDATE work_items SET state = $1, version = $2 WHERE id = $3 AND version = $4 RETURNING version', [item.state, item.version, item.id, expectedVersion])
      if (result.rowCount !== 1) throw new Error('ConcurrencyFailure')
    })
  }
  async close() { await this.pool.end() }
}
