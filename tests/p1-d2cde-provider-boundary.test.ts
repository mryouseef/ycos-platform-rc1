/** P1-D2C/D/E qualification: verified provider identity may enter; authority remains internal and server-derived. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deriveProviderBackedSecurityContext } from '../src/p1/authorization/provider-backed-context'
import type { SupabaseAuthPort } from '../src/p1/auth/supabase-auth-adapter'
import type { ProviderMembershipStore } from '../src/p1/authorization/provider-backed-context'

const now = 1_900_000_000
const policy = { issuer: 'https://sandbox.example.invalid/auth/v1', audience: 'authenticated', nowSeconds: () => now, clockSkewSeconds: 30 }
const validClaims = { iss: policy.issuer, aud: policy.audience, sub: 'subject_synthetic_a', session_id: 'session_synthetic_a', aal: 'aal1', exp: now + 120, nbf: now - 10, role: 'authenticated', organization_id: 'CLIENT_CLAIM_MUST_NOT_WIN', role_code: 'ROLE-08' }
const auth = (claims: Record<string, unknown> | undefined = validClaims): SupabaseAuthPort => ({
  getClaims: async () => ({ data: claims ? { claims } : undefined, error: null }),
  signInWithPassword: async () => ({ data: null, error: null }),
  exchangeCodeForSession: async () => ({ data: null, error: null }),
  verifyOtp: async () => ({ data: null, error: null }),
  resetPasswordForEmail: async () => ({ data: null, error: null }),
  signOut: async () => ({ data: null, error: null }),
})
const store = (overrides: Partial<Awaited<ReturnType<ProviderMembershipStore['providerMembership']>>> = {}): ProviderMembershipStore => ({
  providerMembership: async () => ({
    user: { id: 'usr_synthetic_a', providerIssuer: policy.issuer, providerSubject: 'subject_synthetic_a', status: 'ACTIVE' },
    memberships: [{ id: 'mem_synthetic_a', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_A', roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 7 }],
    organizations: { ORG_INTERNAL_A: { id: 'ORG_INTERNAL_A', status: 'ACTIVE' } },
    ...overrides,
  }),
})

test('P1-D2CDE: verified provider identity resolves only server-side internal authority', async () => {
  const context = await deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store(), requestId: 'req_synthetic_a' })
  assert.equal(context.actorId, 'usr_synthetic_a')
  assert.equal(context.membershipId, 'mem_synthetic_a')
  assert.equal(context.tenantId, 'ORG_INTERNAL_A')
  assert.deepEqual(context.roles, ['ROLE-04'])
  assert.equal(context.authorityVersion, 7)
  assert.equal(context.actorType, 'authenticated-user')
})

test('P1-D2CDE: provider custom organization and role claims cannot override internal authority', async () => {
  const context = await deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store(), requestId: 'req_claim_override' })
  assert.notEqual(context.tenantId, validClaims.organization_id)
  assert.notDeepEqual(context.roles, [validClaims.role_code])
})

test('P1-D2CDE: absent internal user, inactive user, non-active membership, ambiguity, and unsupported role deny', async () => {
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: { providerMembership: async () => undefined }, requestId: 'req_absent' }), /AccessDenied/)
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store({ user: { id: 'usr_synthetic_a', providerIssuer: policy.issuer, providerSubject: 'subject_synthetic_a', status: 'DISABLED' } }), requestId: 'req_disabled' }), /AccessDenied/)
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store({ memberships: [{ id: 'mem_pending', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_A', roleCode: 'ROLE-04', status: 'PENDING', authorityVersion: 1 }] }), requestId: 'req_pending' }), /AccessDenied/)
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store({ memberships: [{ id: 'mem_one', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_A', roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 1 }, { id: 'mem_two', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_B', roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 1 }], organizations: { ORG_INTERNAL_A: { id: 'ORG_INTERNAL_A', status: 'ACTIVE' }, ORG_INTERNAL_B: { id: 'ORG_INTERNAL_B', status: 'ACTIVE' } } }), requestId: 'req_ambiguous' }), /AccessDenied/)
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store({ memberships: [{ id: 'mem_bad_role', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_A', roleCode: 'ROLE-99', status: 'ACTIVE', authorityVersion: 1 }] }), requestId: 'req_bad_role' }), /AccessDenied/)
  await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(), policy, store: store({ memberships: [{ id: 'mem_supported', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_A', roleCode: 'ROLE-04', status: 'ACTIVE', authorityVersion: 1 }, { id: 'mem_unsupported', userId: 'usr_synthetic_a', organizationId: 'ORG_INTERNAL_B', roleCode: 'ROLE-99', status: 'ACTIVE', authorityVersion: 1 }], organizations: { ORG_INTERNAL_A: { id: 'ORG_INTERNAL_A', status: 'ACTIVE' }, ORG_INTERNAL_B: { id: 'ORG_INTERNAL_B', status: 'ACTIVE' } } }), requestId: 'req_mixed_ambiguous' }), /AccessDenied/)
})

test('P1-D2CDE: invalid issuer, audience, expiry, not-before, subject, and role deny before membership lookup', async () => {
  const cases = [
    { ...validClaims, iss: 'https://wrong.invalid' }, { ...validClaims, aud: 'wrong' }, { ...validClaims, exp: now - 31 },
    { ...validClaims, nbf: now + 31 }, { ...validClaims, sub: '' }, { ...validClaims, role: 'anon' },
  ]
  for (const claims of cases) await assert.rejects(() => deriveProviderBackedSecurityContext({ auth: auth(claims), policy, store: store(), requestId: 'req_invalid' }), /AuthenticationRequired/)
})

test('P1-D2CDE: protected route is dynamic, no-store, server-cookie based, and contains no local-principal header', () => {
  const route = readFileSync(resolve(process.cwd(), 'app/api/protected/workitems/route.ts'), 'utf8')
  const local = readFileSync(resolve(process.cwd(), 'app/api/local/workitems/route.ts'), 'utf8')
  assert.match(route, /cookies\(\)/)
  assert.match(route, /force-dynamic/)
  assert.match(route, /cache-control': 'no-store/)
  assert.doesNotMatch(route, /x-ycos-local-principal|tenantId|roleCode|organizationHint/)
  assert.match(local, /x-ycos-local-principal/)
})

test('P1-D2CDE: managed repository sets actor and tenant locally only within a transaction', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/ile01/managed-postgres.ts'), 'utf8')
  assert.match(source, /set_config\('app\.actor_id', \$1, true\)/)
  assert.match(source, /set_config\('app\.tenant_id', \$1, true\)/)
  assert.match(source, /\^\[A-Za-z0-9_-\]\+\$/)
  assert.match(source, /BEGIN/)
  assert.match(source, /ROLLBACK/)
  assert.doesNotMatch(source, /SET\s+app\.actor_id\s*=/)
})
