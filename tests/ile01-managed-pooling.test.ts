import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { IleManagedPostgresWorkItemRepository } from '../src/ile01/managed-postgres'

const url = process.env.ILE01_MANAGED_DATABASE_URL
const run = process.env.ILE01_MANAGED_PG_ALLOW_INSECURE_TEST === 'true'
const require = createRequire(import.meta.url)
const { Pool } = require('pg') as { Pool: new (options: Record<string, unknown>) => any }
async function withTenant(pool: any, tenant: string | null, fn: (client: any) => Promise<void>) { const client = await pool.connect(); try { await client.query('BEGIN'); if (tenant !== null) await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]); await fn(client); await client.query('COMMIT') } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error } finally { client.release() } }
async function denied(client: any, sql: string) { await client.query('SAVEPOINT expected_deny'); await assert.rejects(() => client.query(sql)); await client.query('ROLLBACK TO SAVEPOINT expected_deny') }
test('ILE managed PostgreSQL binding denies context leaks under reuse, rollback, errors and concurrency', { skip: !url || !run }, async () => {
  const a = new IleManagedPostgresWorkItemRepository(url!, true)
  const results = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
    const tenant = i % 2 ? 'SYNTHETIC_B' : 'SYNTHETIC_A'
    const own = tenant === 'SYNTHETIC_A' ? 'W-A' : 'W-B'
    const other = tenant === 'SYNTHETIC_A' ? 'W-B' : 'W-A'
    const read = await a.get(tenant, own)
    await assert.rejects(() => a.get(tenant, other), /NotFound/)
    return read.tenantId
  }))
  assert(results.every((tenant, index) => tenant === (index % 2 ? 'SYNTHETIC_B' : 'SYNTHETIC_A')))
  await assert.rejects(() => a.get('', 'W-A'), /IntegrityFailure/)
  await a.close()
})

test('ILE additive RLS policies enforce tenant visibility and all mutations fail closed', { skip: !url || !run }, async () => {
  const pool = new Pool({ connectionString: url, ssl: false, max: 1 })
  await withTenant(pool, 'SYNTHETIC_A', async (client) => { assert.equal((await client.query("SELECT id FROM work_items WHERE id='W-A'")).rowCount, 1); assert.equal((await client.query("SELECT id FROM work_items WHERE id='W-B'")).rowCount, 0); assert.equal((await client.query("INSERT INTO work_items VALUES ('W-A2','SYNTHETIC_A','draft',1,'synthetic')")).rowCount, 1); await denied(client, "INSERT INTO work_items VALUES ('W-B2','SYNTHETIC_B','draft',1,'synthetic')"); assert.equal((await client.query("UPDATE work_items SET state='submitted',version=2 WHERE id='W-A2'")).rowCount, 1); assert.equal((await client.query("UPDATE work_items SET state='submitted',version=2 WHERE id='W-B'")).rowCount, 0); assert.equal((await client.query("DELETE FROM work_items WHERE id='W-A2'")).rowCount, 1); assert.equal((await client.query("DELETE FROM work_items WHERE id='W-B'")).rowCount, 0) })
  await withTenant(pool, null, async (client) => { assert.equal((await client.query('SELECT * FROM work_items')).rowCount, 0) })
  await withTenant(pool, 'INVALID', async (client) => { assert.equal((await client.query('SELECT * FROM work_items')).rowCount, 0) })
  const client = await pool.connect(); try { await client.query('BEGIN'); await client.query("SELECT set_config('app.tenant_id', 'SYNTHETIC_A', true)"); await client.query('ROLLBACK'); assert.equal((await client.query("SELECT current_setting('app.tenant_id', true) AS tenant")).rows[0].tenant, '') } finally { client.release(); await pool.end() }
})
