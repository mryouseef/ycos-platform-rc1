/**
 * R01B §7 — REQUIRED DATABASE-LEVEL SECURITY PROOF.
 *
 * This test connects to a REAL PostgreSQL instance (via ILE01_MANAGED_DATABASE_URL, the same
 * variable src/p2/runtime.ts uses) and exercises the actual applied migrations, not a mirror.
 * It seeds synthetic organizations/users/memberships, runs migrations 001 and 002 if not
 * already applied, and proves items A-M from the R01B report against the live function.
 *
 * If ILE01_MANAGED_DATABASE_URL is not set, every test in this file is SKIPPED (via t.skip),
 * never silently reported as passing and never fabricated as passing in any report — this
 * matches the disclosed limitation: pure TypeScript simulation is not sufficient proof for a
 * SECURITY DEFINER database primitive, and this file is the actual proof, run once a real
 * database is available.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const databaseUrl = process.env.ILE01_MANAGED_DATABASE_URL

async function withClient<T>(run: (client: any) => Promise<T>): Promise<T> {
  const { Pool } = require('pg')
  const pool = new Pool({ connectionString: databaseUrl, ssl: /sslmode=(require|verify-ca|verify-full)/.test(databaseUrl!) ? { rejectUnauthorized: true } : false })
  try {
    const client = await pool.connect()
    try { return await run(client) } finally { client.release() }
  } finally { await pool.end() }
}

async function applyMigrationsOnce() {
  await withClient(async (client) => {
    for (const path of ['infra/p2/migrations/001_consulting_workflow.sql', 'infra/p2/migrations/002_membership_eligibility_authority.sql']) {
      try { await client.query(readFileSync(path, 'utf8')) } catch (error) {
        // Tolerate "already exists" style re-application; anything else surfaces to the test.
        if (!(error instanceof Error && /already exists|duplicate/i.test(error.message))) throw error
      }
    }
  })
}

async function seed(tenantId: string, actorMembership: { id: string; userId: string; roleCode: string; status: string }, targets: Array<{ id: string; userId: string; organizationId: string; roleCode: string; status: string }>) {
  await withClient(async (client) => {
    await client.query("INSERT INTO organizations (id, status) VALUES ($1, 'ACTIVE') ON CONFLICT (id) DO NOTHING", [tenantId])
    for (const m of [{ ...actorMembership, organizationId: tenantId }, ...targets]) {
      await client.query("INSERT INTO users (id, provider_issuer, provider_subject, status) VALUES ($1, 'test-issuer', $1, 'ACTIVE') ON CONFLICT (id) DO NOTHING", [m.userId])
      await client.query(
        `INSERT INTO organization_memberships (id, user_id, organization_id, role_code, status, authority_version)
         VALUES ($1,$2,$3,$4,$5,1) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, role_code = EXCLUDED.role_code`,
        [m.id, m.userId, m.organizationId, m.roleCode, m.status],
      )
    }
  })
}

async function eligibleAs(tenantId: string, actorId: string, targetMembershipId: string): Promise<boolean> {
  return withClient(async (client) => {
    await client.query('BEGIN')
    try {
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
      await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId])
      const result = await client.query('SELECT public.p2_is_consultant_membership_eligible($1) AS eligible', [targetMembershipId])
      return result.rows[0]?.eligible === true
    } finally { await client.query('ROLLBACK') }
  })
}

const maybeTest = databaseUrl ? test : test.skip

test.before(async () => { if (databaseUrl) await applyMigrationsOnce() })

maybeTest('A. Tenant A / ROLE-05 actor + eligible ACTIVE ROLE-04 target -> true', async () => {
  await seed('r01b-tenant-a', { id: 'r01b-mgr-a', userId: 'r01b-user-mgr-a', roleCode: 'ROLE-05', status: 'ACTIVE' }, [{ id: 'r01b-consultant-a', userId: 'r01b-user-c-a', organizationId: 'r01b-tenant-a', roleCode: 'ROLE-04', status: 'ACTIVE' }])
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-mgr-a', 'r01b-consultant-a'), true)
})

maybeTest('B. Tenant A context + Target belonging to Tenant B -> false', async () => {
  await seed('r01b-tenant-b', { id: 'r01b-mgr-b', userId: 'r01b-user-mgr-b', roleCode: 'ROLE-05', status: 'ACTIVE' }, [{ id: 'r01b-consultant-b', userId: 'r01b-user-c-b', organizationId: 'r01b-tenant-b', roleCode: 'ROLE-04', status: 'ACTIVE' }])
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-mgr-a', 'r01b-consultant-b'), false)
})

maybeTest('C. nonexistent target -> false', async () => {
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-mgr-a', 'r01b-does-not-exist'), false)
})

maybeTest('D. same-tenant wrong-role target -> false', async () => {
  await seed('r01b-tenant-a', { id: 'r01b-mgr-a', userId: 'r01b-user-mgr-a', roleCode: 'ROLE-05', status: 'ACTIVE' }, [{ id: 'r01b-client-a', userId: 'r01b-user-client-a', organizationId: 'r01b-tenant-a', roleCode: 'ROLE-02', status: 'ACTIVE' }])
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-mgr-a', 'r01b-client-a'), false)
})

maybeTest('E. same-tenant inactive/revoked target -> false', async () => {
  await seed('r01b-tenant-a', { id: 'r01b-mgr-a', userId: 'r01b-user-mgr-a', roleCode: 'ROLE-05', status: 'ACTIVE' }, [{ id: 'r01b-consultant-revoked', userId: 'r01b-user-c-revoked', organizationId: 'r01b-tenant-a', roleCode: 'ROLE-04', status: 'REVOKED' }])
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-mgr-a', 'r01b-consultant-revoked'), false)
})

maybeTest('F. ACTIVE actor without ROLE-05 -> false', async () => {
  await seed('r01b-tenant-a', { id: 'r01b-nonmgr-a', userId: 'r01b-user-nonmgr-a', roleCode: 'ROLE-02', status: 'ACTIVE' }, [{ id: 'r01b-consultant-a', userId: 'r01b-user-c-a', organizationId: 'r01b-tenant-a', roleCode: 'ROLE-04', status: 'ACTIVE' }])
  assert.equal(await eligibleAs('r01b-tenant-a', 'r01b-user-nonmgr-a', 'r01b-consultant-a'), false)
})

maybeTest('G. missing app.tenant_id -> false', async () => {
  await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      await client.query("SELECT set_config('app.actor_id', 'r01b-user-mgr-a', true)")
      const result = await client.query('SELECT public.p2_is_consultant_membership_eligible($1) AS eligible', ['r01b-consultant-a'])
      assert.equal(result.rows[0]?.eligible, false)
    } finally { await client.query('ROLLBACK') }
  })
})

maybeTest('H. missing app.actor_id -> false', async () => {
  await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      await client.query("SELECT set_config('app.tenant_id', 'r01b-tenant-a', true)")
      const result = await client.query('SELECT public.p2_is_consultant_membership_eligible($1) AS eligible', ['r01b-consultant-a'])
      assert.equal(result.rows[0]?.eligible, false)
    } finally { await client.query('ROLLBACK') }
  })
})

maybeTest('I. PUBLIC has no EXECUTE privilege on the primitive', async () => {
  await withClient(async (client) => {
    const result = await client.query("SELECT has_function_privilege('public', 'public.p2_is_consultant_membership_eligible(text)', 'EXECUTE') AS can_execute")
    assert.equal(result.rows[0]?.can_execute, false)
  })
})

maybeTest('J. ycos_ile_runtime remains NOBYPASSRLS', async () => {
  await withClient(async (client) => {
    const result = await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'ycos_ile_runtime'")
    assert.equal(result.rows[0]?.rolbypassrls, false)
  })
})

maybeTest('K. ordinary ycos_ile_runtime SELECT still cannot see a peer membership row', async () => {
  await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      await client.query("SELECT set_config('app.tenant_id', 'r01b-tenant-a', true)")
      await client.query("SELECT set_config('app.actor_id', 'r01b-user-mgr-a', true)")
      const result = await client.query('SELECT 1 FROM organization_memberships WHERE user_id = $1', ['r01b-user-c-a'])
      assert.equal(result.rowCount, 0)
    } finally { await client.query('ROLLBACK') }
  })
})

maybeTest('L. p1_memberships_select_self policy still exists, unmodified', async () => {
  await withClient(async (client) => {
    const result = await client.query("SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='organization_memberships' AND policyname='p1_memberships_select_self'")
    assert.equal(result.rowCount, 1)
    assert.match(String(result.rows[0].qual), /app\.actor_id/)
  })
})

maybeTest('M. organization_memberships still has RLS + FORCE RLS enabled', async () => {
  await withClient(async (client) => {
    const result = await client.query("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'organization_memberships'")
    assert.equal(result.rows[0]?.relrowsecurity, true)
    assert.equal(result.rows[0]?.relforcerowsecurity, true)
  })
})

if (!databaseUrl) {
  test('NOTICE: this file requires ILE01_MANAGED_DATABASE_URL to run for real — all cases above were SKIPPED, not passed', () => {
    assert.ok(true, 'Set ILE01_MANAGED_DATABASE_URL and re-run to get real PASS/FAIL results for the R01B database-level proof.')
  })
}
