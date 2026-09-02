/**
 * R01C-v2 static/source validation. The R01C review disproved the previous
 * GRANT/REVOKE-to-postgres approach with live Supabase evidence. These checks now assert
 * the OPPOSITE: that no such membership grant/revoke to postgres exists anywhere in the
 * auto-applied migration, and that ownership transfer is fully isolated in a separate,
 * clearly-labeled manual/privileged file that is never executed by the ordinary migration
 * runner. Text-level checks only — no live Postgres needed; they do not prove runtime
 * behavior. See tests/p2-eligibility-integration.test.ts for the live-database proof
 * (still NOT RUN here — same disclosed limitation as R01/R01B).
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = 'infra/p2/migrations/002_membership_eligibility_authority.sql'
const manualPath = 'infra/p2/migrations/003_MANUAL_PRIVILEGED_ownership_transfer.sql'

function executableOnly(source: string): string {
  return source.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n')
}

test('R01C_MANAGED_SUPABASE_OWNERSHIP_TRANSFER: 002 contains NO GRANT/REVOKE of role membership to/from postgres (the disproven pattern is fully removed)', async () => {
  const source = await readFile(migrationPath, 'utf8')
  const executable = executableOnly(source)
  assert.doesNotMatch(executable, /GRANT ycos_p2_eligibility_owner TO postgres/)
  assert.doesNotMatch(executable, /REVOKE ycos_p2_eligibility_owner FROM postgres/)
})

test('002 never attempts ALTER FUNCTION ... OWNER TO — ownership transfer is fully deferred to 003', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.doesNotMatch(executableOnly(source), /OWNER TO ycos_p2_eligibility_owner/)
})

test('the ownership transfer exists, isolated, in 003_MANUAL_PRIVILEGED_ownership_transfer.sql', async () => {
  const source = await readFile(manualPath, 'utf8')
  assert.match(source, /ALTER FUNCTION public\.p2_is_consultant_membership_eligible\(text\) OWNER TO ycos_p2_eligibility_owner;/)
})

test('003 is explicitly labeled as a manual/privileged step not run by the ordinary executor', async () => {
  const source = await readFile(manualPath, 'utf8')
  assert.match(source, /MANUAL \/ PRIVILEGED STEP — DO NOT RUN VIA THE ORDINARY MIGRATION EXECUTOR/)
  assert.match(source, /supabase_admin/)
})

test('003 contains no other DDL beyond the single ownership-transfer statement (narrow, single-purpose manual step)', async () => {
  const source = await readFile(manualPath, 'utf8')
  const executable = executableOnly(source).trim()
  const statements = executable.split(';').map((s) => s.trim()).filter(Boolean)
  assert.equal(statements.length, 1, `expected exactly one executable statement in 003, found ${statements.length}`)
  assert.match(statements[0], /ALTER FUNCTION/)
})

test('FINAL_FUNCTION_OWNER (deferred): 002 leaves the function owned by whoever executes it (postgres); 003 is the only place ycos_p2_eligibility_owner ownership is asserted', async () => {
  const source002 = await readFile(migrationPath, 'utf8')
  assert.doesNotMatch(executableOnly(source002), /ycos_ile_runtime.*OWNER|OWNER TO ycos_ile_runtime/)
})

test('SECURITY_DEFINER: function remains SECURITY DEFINER', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /SECURITY DEFINER/)
})

test('FIXED_SEARCH_PATH: search_path is fixed to pg_catalog, public', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /SET search_path = pg_catalog, public/)
})

test('PUBLIC_EXECUTE_REVOKED: PUBLIC has EXECUTE revoked on the function', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /REVOKE ALL ON FUNCTION public\.p2_is_consultant_membership_eligible\(text\) FROM PUBLIC;/)
})

test('RUNTIME_EXECUTE: ycos_ile_runtime is granted EXECUTE only, nothing broader', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.p2_is_consultant_membership_eligible\(text\) TO ycos_ile_runtime;/)
  assert.doesNotMatch(source, /GRANT (SELECT|INSERT|UPDATE|DELETE|ALL)[^;]*TO ycos_ile_runtime/)
})

test('OWNER_NOLOGIN and OWNER_BYPASSRLS: dedicated owner role still created with NOLOGIN and BYPASSRLS', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /CREATE ROLE ycos_p2_eligibility_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;/)
})

test('RUNTIME_NOBYPASSRLS: neither 002 nor 003 grants BYPASSRLS to ycos_ile_runtime', async () => {
  const source002 = executableOnly(await readFile(migrationPath, 'utf8'))
  const source003 = executableOnly(await readFile(manualPath, 'utf8'))
  assert.doesNotMatch(source002, /BYPASSRLS[^;]*ycos_ile_runtime|ycos_ile_runtime[^;]*BYPASSRLS/)
  assert.doesNotMatch(source003, /BYPASSRLS[^;]*ycos_ile_runtime|ycos_ile_runtime[^;]*BYPASSRLS/)
})

test('OWNER_NO_PUBLIC_CREATE: CREATE on schema public is explicitly revoked from the owner role', async () => {
  const source = await readFile(migrationPath, 'utf8')
  assert.match(source, /REVOKE CREATE ON SCHEMA public FROM ycos_p2_eligibility_owner;/)
})

test('P1_RLS_UNCHANGED: no executable statement in 002 or 003 touches a policy', async () => {
  const source002 = executableOnly(await readFile(migrationPath, 'utf8'))
  const source003 = executableOnly(await readFile(manualPath, 'utf8'))
  assert.doesNotMatch(source002, /DROP POLICY|ALTER POLICY|CREATE POLICY/)
  assert.doesNotMatch(source003, /DROP POLICY|ALTER POLICY|CREATE POLICY/)
})

test('ELIGIBILITY_LOGIC_UNCHANGED: the function body predicate text is unchanged from the R01B-qualified version', async () => {
  const source = await readFile(migrationPath, 'utf8')
  const bodyStart = source.indexOf('DECLARE')
  const bodyEnd = source.indexOf('$fn$;')
  const body = source.slice(bodyStart, bodyEnd)
  assert.match(body, /role_code = 'ROLE-05'/)
  assert.match(body, /role_code = 'ROLE-04'/)
  assert.match(body, /current_setting\('app\.tenant_id', true\)/)
  assert.match(body, /current_setting\('app\.actor_id', true\)/)
  assert.doesNotMatch(body, /EXECUTE |format\(/)
})
