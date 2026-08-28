/** P1-D2B static security boundary checks: no provider network invocation, real identity fixture, credential, service-role, or client DB path. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (name: string) => readFile(path.join(root, name), 'utf8')

test('P1-D2B static boundary: auth source contains no service-role, localStorage, direct PostgREST, or session-only authorization', async () => {
  const source = await Promise.all(['src/p1/auth/supabase-server-client.ts', 'src/p1/auth/supabase-auth-adapter.ts', 'proxy.ts', 'app/auth/callback/route.ts', 'app/auth/confirm/route.ts', 'app/auth/recovery/route.ts', 'app/auth/logout/route.ts'].map(read))
  const joined = source.join('\n')
  for (const forbidden of ['SUPABASE_SERVICE_ROLE', 'service_role', 'localStorage', 'getSession(', '.from(', 'BYPASSRLS', 'process.env.ILE01_MANAGED_DATABASE_URL', 'console.log', 'fetch(']) assert.equal(joined.includes(forbidden), false, forbidden)
  assert.match(joined, /getClaims\(/)
  assert.match(joined, /Cache-Control/)
  assert.equal(joined.includes('/workspace'), false)
})

test('P1-D2B static boundary: source keeps P1-D1 migration and local principal paths outside the auth implementation', async () => {
  const paths = await Promise.all(['src/p1/auth/identity-resolution.ts', 'src/p1/authorization/organization-context.ts', 'app/api/local/workitems/route.ts', 'infra/p1/migrations/001_identity_foundation.sql', 'infra/p1/migrations/002_membership_rls.sql'].map(read))
  assert.match(paths[0], /resolveSyntheticMembership/)
  assert.match(paths[0], /resolveVerifiedMembership/)
  assert.match(paths[1], /deriveAuthenticatedOrganizationContext/)
  assert.match(paths[2], /x-ycos-local-principal/)
  assert.match(paths[3], /users_provider_identity_key/)
  assert.match(paths[4], /FORCE ROW LEVEL SECURITY/)
})

test('P1-D2B static boundary: package pins only approved Supabase packages and excludes legacy or generalized auth frameworks', async () => {
  const manifest = await read('package.json')
  assert.match(manifest, /"@supabase\/ssr": "0\.12\.5"/)
  assert.match(manifest, /"@supabase\/supabase-js": "2\.112\.4"/)
  for (const forbidden of ['next-auth', '@supabase/auth-helpers', '"jose"', '"prisma"']) assert.equal(manifest.includes(forbidden), false, forbidden)
})
