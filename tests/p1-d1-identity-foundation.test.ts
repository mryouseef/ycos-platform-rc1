/** P1-D1 synthetic-only qualification; no provider SDK, credentials, real PII, or remote database. */
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { P1_SYNTHETIC_ISSUER, resolveSyntheticMembership, type P1Membership, type P1Organization, type P1InternalUser } from '../src/p1/auth/identity-resolution'
import { deriveSyntheticOrganizationContext } from '../src/p1/authorization/organization-context'

const run = process.env.P1_D1_SYNTHETIC_PG === 'true'
const socket = process.env.P1_D1_PG_SOCKET
const port = process.env.P1_D1_PG_PORT
const database = process.env.P1_D1_PG_DATABASE
const psql = process.env.P1_D1_PSQL_BIN
const exec = promisify(execFile)
const require = createRequire(import.meta.url)
const { Pool } = require('pg') as { Pool: new (options: Record<string, unknown>) => any }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const callPsql = async (user: string, sql: string, expectFailure = false) => {
  if (!psql || !socket || !port || !database) throw new Error('P1_D1_HARNESS_UNCONFIGURED')
  try {
    const result = await exec(psql, ['-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-h', socket, '-p', port, '-U', user, '-d', database, '-c', sql], { cwd: root })
    if (expectFailure) throw new Error('EXPECTED_SQL_FAILURE_MISSING')
    return `${result.stdout}\n${result.stderr}`.trim()
  } catch (error) {
    if (!expectFailure) throw error
    const failure = error as { stdout?: string; stderr?: string }
    return `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`
  }
}
const filePsql = async (file: string) => {
  if (!psql || !socket || !port || !database) throw new Error('P1_D1_HARNESS_UNCONFIGURED')
  await exec(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', port, '-U', 'ubuntu', '-d', database, '-f', file], { cwd: root })
}
const runtimePool = (max = 1) => new Pool({ host: socket, port: Number(port), database, user: 'ycos_ile_runtime', max })
const local = async <T>(pool: any, actorId: string | null, tenantId: string | null, fn: (client: any) => Promise<T>) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (actorId) await client.query("SELECT set_config('app.actor_id', $1, true)", [actorId])
    if (tenantId) await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
    const value = await fn(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally { client.release() }
}
const expectCode = async (user: string, sql: string, code: string) => assert.match(await callPsql(user, sql, true), new RegExp(`ERROR:\\s+${code}:`))

test('P1-D1 identity, membership, RLS, context, and synthetic data controls', { skip: !run }, async () => {
  await filePsql(path.join(root, 'infra/pn03/migrations/001_work_items.sql'))
  await filePsql(path.join(root, 'infra/ile01/migrations/001_ile_rls.sql'))
  await filePsql(path.join(root, 'infra/p1/migrations/001_identity_foundation.sql'))
  await filePsql(path.join(root, 'infra/p1/migrations/002_membership_rls.sql'))
  await callPsql('ubuntu', "INSERT INTO users(id,provider_issuer,provider_subject,status) VALUES ('usr_syn_a','https://issuer.invalid/ycos-p1-d1','sub_syn_a','ACTIVE'),('usr_syn_b','https://issuer.invalid/ycos-p1-d1','sub_syn_b','ACTIVE'),('usr_syn_pending','https://issuer.invalid/ycos-p1-d1','sub_syn_pending','ACTIVE'),('usr_syn_suspended','https://issuer.invalid/ycos-p1-d1','sub_syn_suspended','ACTIVE'),('usr_syn_revoked','https://issuer.invalid/ycos-p1-d1','sub_syn_revoked','ACTIVE'); INSERT INTO organizations(id,status) VALUES ('org_syn_a','ACTIVE'),('org_syn_b','ACTIVE'); INSERT INTO organization_memberships(id,user_id,organization_id,role_code,status,authority_version) VALUES ('mem_syn_a','usr_syn_a','org_syn_a','ROLE-04','ACTIVE',1),('mem_syn_b','usr_syn_b','org_syn_b','ROLE-02','ACTIVE',1),('mem_syn_pending','usr_syn_pending','org_syn_a','ROLE-04','PENDING',1),('mem_syn_suspended','usr_syn_suspended','org_syn_a','ROLE-04','SUSPENDED',1),('mem_syn_revoked','usr_syn_revoked','org_syn_a','ROLE-04','REVOKED',1); INSERT INTO work_items(id,tenant_id,state,version,classification) VALUES ('W-P1-A','org_syn_a','draft',1,'synthetic'),('W-P1-B','org_syn_b','draft',1,'synthetic');")
  assert.equal(await callPsql('ubuntu', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','organizations','organization_memberships')"), '3') // Q01
  assert.match(await callPsql('ubuntu', "SELECT string_agg(conname,',' ORDER BY conname) FROM pg_constraint WHERE conrelid='organization_memberships'::regclass"), /organization_memberships_user_organization_key/) // Q02
  await expectCode('ubuntu', "INSERT INTO users(id,provider_issuer,provider_subject,status) VALUES ('usr_syn_dup','https://issuer.invalid/ycos-p1-d1','sub_syn_a','ACTIVE')", '23505') // Q03
  await expectCode('ubuntu', "INSERT INTO organization_memberships(id,user_id,organization_id,role_code,status,authority_version) VALUES ('mem_syn_bad_state','usr_syn_a','org_syn_a','ROLE-04','INVALID',1)", '23514') // Q04
  await expectCode('ubuntu', "INSERT INTO organization_memberships(id,user_id,organization_id,role_code,status,authority_version) VALUES ('mem_syn_bad_role','usr_syn_a','org_syn_a','ROLE-X','ACTIVE',1)", '23514') // Q05
  await expectCode('ubuntu', "INSERT INTO organization_memberships(id,user_id,organization_id,role_code,status,authority_version) VALUES ('mem_syn_bad_org','usr_syn_a','org_syn_missing','ROLE-04','ACTIVE',1)", '23503') // Q06
  await expectCode('ubuntu', "INSERT INTO organization_memberships(id,user_id,organization_id,role_code,status,authority_version) VALUES ('mem_syn_bad_user','usr_syn_missing','org_syn_a','ROLE-04','ACTIVE',1)", '23503') // Q07
  const pool = runtimePool(2)
  try {
    assert.equal(await local(pool, 'usr_syn_a', 'org_syn_a', async (c) => (await c.query("SELECT id FROM organization_memberships WHERE id='mem_syn_b'")).rowCount), 0) // Q08
    await assert.rejects(() => local(pool, 'usr_syn_a', 'org_syn_a', async (c) => c.query("UPDATE organization_memberships SET status='SUSPENDED' WHERE id='mem_syn_b'")), (error: { code?: string }) => error.code === '42501') // Q09: minimum-grant denial is stronger than zero-row RLS filtering.
    assert.equal(await local(pool, 'usr_syn_a', null, async (c) => (await c.query('SELECT id FROM users')).rowCount), 1) // Q10 self only
    assert.equal(await local(pool, null, null, async (c) => (await c.query('SELECT id FROM organization_memberships')).rowCount), 0) // Q11
    assert.equal(await local(pool, 'usr_syn_a', 'org_syn_b', async (c) => (await c.query("SELECT id FROM organizations WHERE id='org_syn_b'")).rowCount), 0) // Q12
    assert.equal(await callPsql('ubuntu', "SELECT relrowsecurity::text||','||relforcerowsecurity::text FROM pg_class WHERE oid='organization_memberships'::regclass"), 'true,true') // Q13/Q14
    assert.equal(await callPsql('ubuntu', "SELECT rolbypassrls::text FROM pg_roles WHERE rolname='ycos_ile_runtime'"), 'false') // Q15
    assert.equal(await callPsql('ubuntu', "SELECT has_table_privilege('ycos_ile_runtime','organization_memberships','SELECT')::text||','||has_table_privilege('ycos_ile_runtime','organization_memberships','INSERT')::text||','||has_schema_privilege('ycos_ile_runtime','public','CREATE')::text"), 'true,false,false') // Q16
    const single = runtimePool(1)
    try {
      await local(single, 'usr_syn_a', 'org_syn_a', async (c) => assert.equal((await c.query("SELECT id FROM work_items WHERE id='W-P1-A'")).rowCount, 1))
      const reset = await local(single, null, null, async (c) => c.query("SELECT current_setting('app.tenant_id', true) AS tenant, count(*)::int AS count FROM work_items"))
      assert.notEqual(reset.rows[0].tenant, 'org_syn_a'); assert.equal(reset.rows[0].count, 0) // Q17/Q18
    } finally { await single.end() }
    const concurrent = await Promise.all(['a', 'b'].map((entry) => local(pool, `usr_syn_${entry}`, `org_syn_${entry}`, async (c) => (await c.query('SELECT id FROM work_items ORDER BY id')).rows.map((row: { id: string }) => row.id))))
    assert.deepEqual(concurrent, [['W-P1-A'], ['W-P1-B']]) // Q19
  } finally { await pool.end() }
  const users: P1InternalUser[] = [{ id: 'usr_syn_a', providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_a', status: 'ACTIVE' }, { id: 'usr_syn_pending', providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_pending', status: 'ACTIVE' }, { id: 'usr_syn_suspended', providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_suspended', status: 'ACTIVE' }, { id: 'usr_syn_revoked', providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_revoked', status: 'ACTIVE' }]
  const organizations: P1Organization[] = [{ id: 'org_syn_a', status: 'ACTIVE' }, { id: 'org_syn_b', status: 'ACTIVE' }]
  const memberships: P1Membership[] = [{ id: 'mem_syn_a', userId: 'usr_syn_a', organizationId: 'org_syn_a', roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 1 }, { id: 'mem_syn_pending', userId: 'usr_syn_pending', organizationId: 'org_syn_a', roleCode: 'ROLE-04', status: 'PENDING', authorityVersion: 1 }, { id: 'mem_syn_suspended', userId: 'usr_syn_suspended', organizationId: 'org_syn_a', roleCode: 'ROLE-04', status: 'SUSPENDED', authorityVersion: 1 }, { id: 'mem_syn_revoked', userId: 'usr_syn_revoked', organizationId: 'org_syn_a', roleCode: 'ROLE-04', status: 'REVOKED', authorityVersion: 1 }]
  const store = { findUser: (issuer: string, subject: string) => users.find((user) => user.providerIssuer === issuer && user.providerSubject === subject), membershipsForUser: (userId: string) => memberships.filter((membership) => membership.userId === userId), findOrganization: (id: string) => organizations.find((organization) => organization.id === id) }
  const resolved = resolveSyntheticMembership(store, { providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_a', organizationHint: 'org_syn_a' })
  const context = deriveSyntheticOrganizationContext(resolved, 'req_syn_p1')
  assert.equal(context.tenantId, 'org_syn_a'); assert.equal(context.membershipId, 'mem_syn_a') // Q20
  assert.throws(() => resolveSyntheticMembership(store, { providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_suspended', organizationHint: 'org_syn_a' }), /AccessDenied/) // Q21
  assert.throws(() => resolveSyntheticMembership(store, { providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_revoked', organizationHint: 'org_syn_a' }), /AccessDenied/) // Q22
  assert.throws(() => resolveSyntheticMembership(store, { providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_pending', organizationHint: 'org_syn_a' }), /AccessDenied/) // Q23
  assert.throws(() => resolveSyntheticMembership(store, { providerIssuer: P1_SYNTHETIC_ISSUER, providerSubject: 'sub_syn_a', organizationHint: 'org_syn_b' }), /AccessDenied/) // Q24
  assert.equal(await callPsql('ubuntu', "SELECT count(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('password','access_token','refresh_token','raw_session_cookie','mfa_secret','email','phone','display_name','last_login','provider_session_id')"), '0') // Q25
  assert.equal(await callPsql('ubuntu', "SELECT count(*)::text FROM users WHERE id !~ '^usr_syn_' OR provider_issuer <> 'https://issuer.invalid/ycos-p1-d1' OR provider_subject !~ '^sub_syn_'"), '0') // Q26
})
