/** P1-D2B provider-neutral tests: fake Supabase port only; no network, secrets, provider user, or database. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { beginRecovery, completeCallback, completeConfirmation, logout, startLogin, validateIdentity, type SupabaseAuthPort } from '../src/p1/auth/supabase-auth-adapter'
import { genericRecoveryResponse, requireAal, resolveSafeLocalPath } from '../src/p1/auth/session-policy'
import { NextRequest } from 'next/server'
import { GET as callbackGet } from '../app/auth/callback/route'
import { GET as confirmGet } from '../app/auth/confirm/route'
import { POST as recoveryPost } from '../app/auth/recovery/route'
import { POST as logoutPost } from '../app/auth/logout/route'

const now = 2_000_000_000
const policy = { issuer: 'https://auth.p1d2.invalid/auth/v1', audience: 'authenticated', nowSeconds: () => now, clockSkewSeconds: 30 }
const claims = (overrides: Record<string, unknown> = {}) => ({ iss: policy.issuer, aud: policy.audience, exp: now + 60, sub: 'sub_p1d2_syn_a', aal: 'aal1', session_id: 'session_p1d2_syn_a', role: 'authenticated', ...overrides })
const port = (overrides: Partial<SupabaseAuthPort> = {}): SupabaseAuthPort => ({
  getClaims: async () => ({ data: { claims: claims() }, error: null }),
  signInWithPassword: async () => ({ data: {}, error: null }),
  exchangeCodeForSession: async () => ({ data: {}, error: null }),
  verifyOtp: async () => ({ data: {}, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
  signOut: async () => ({ error: null }),
  ...overrides,
})

test('D2-T01 valid synthetic verified claims normalize identity without tenant or role authority', async () => {
  const identity = await validateIdentity(port(), policy)
  assert.deepEqual(identity, { providerIssuer: policy.issuer, providerSubject: 'sub_p1d2_syn_a', assuranceLevel: 'aal1', sessionId: 'session_p1d2_syn_a' })
  assert.equal('tenantId' in identity, false)
  assert.equal('role' in identity, false)
})

test('D2-T03 to D2-T11 reject malformed, invalid, wrong-boundary, expired, and unavailable claim states', async () => {
  const invalidPorts: SupabaseAuthPort[] = [
    port({ getClaims: async () => ({ data: null, error: null }) }),
    port({ getClaims: async () => ({ data: { claims: claims({ iss: 'https://other.invalid/auth/v1' }) }, error: null }) }),
    port({ getClaims: async () => ({ data: { claims: claims({ aud: 'anon' }) }, error: null }) }),
    port({ getClaims: async () => ({ data: { claims: claims({ exp: now - 31 }) }, error: null }) }),
    port({ getClaims: async () => ({ data: { claims: claims({ nbf: now + 31 }) }, error: null }) }),
    port({ getClaims: async () => ({ data: { claims: claims({ role: 'service_role' }) }, error: null }) }),
    port({ getClaims: async () => ({ data: null, error: new Error('provider unavailable') }) }),
  ]
  for (const fake of invalidPorts) await assert.rejects(() => validateIdentity(fake, policy), /AuthenticationRequired/)
})

test('D2-T29 requires AAL2 only as assurance and never as business authorization', () => {
  assert.doesNotThrow(() => requireAal('aal1', 'aal1'))
  assert.doesNotThrow(() => requireAal('aal2', 'aal2'))
  assert.throws(() => requireAal('aal1', 'aal2'), /AccessDenied/)
})

test('D2-T32 to D2-T36 contain callback, recovery, login, logout, and redirect errors', async () => {
  await assert.rejects(() => completeCallback(port(), ''), /AuthenticationRequired/)
  await assert.rejects(() => completeConfirmation(port(), 'invalid', 'opaque'), /AuthenticationRequired/)
  await assert.rejects(() => startLogin(port(), { email: '', password: '' }), /AuthenticationRequired/)
  await assert.rejects(() => logout(port({ signOut: async () => ({ error: new Error('unavailable') }) })), /DependencyUnavailable/)
  assert.equal(resolveSafeLocalPath('/ar/workspace', '/ar/login'), '/ar/workspace')
  assert.equal(resolveSafeLocalPath('https://attacker.invalid', '/ar/login'), '/ar/login')
  assert.equal(resolveSafeLocalPath('//attacker.invalid', '/ar/login'), '/ar/login')
  assert.equal(resolveSafeLocalPath('/%2e%2e/admin', '/ar/login'), '/ar/login')
  assert.deepEqual(genericRecoveryResponse(), { status: 'accepted' })
  await assert.doesNotReject(() => beginRecovery(port({ resetPasswordForEmail: async () => ({ data: null, error: new Error('not found') }) }), 'p1d2-synthetic-a@example.invalid', 'https://app.invalid/auth/confirm'))
})

test('D2-T30 to D2-T43 auth routes remain non-cacheable, non-enumerating, and fail closed without provider configuration', async () => {
  const callback = await callbackGet(new NextRequest('https://app.p1d2.invalid/auth/callback?code=opaque'))
  assert.equal(callback.status, 503)
  assert.equal(callback.headers.get('cache-control'), 'no-store')
  const confirmation = await confirmGet(new NextRequest('https://app.p1d2.invalid/auth/confirm?type=recovery&token_hash=opaque'))
  assert.equal(confirmation.status, 401)
  assert.equal(confirmation.headers.get('cache-control'), 'no-store')
  const recovery = await recoveryPost(new NextRequest('https://app.p1d2.invalid/auth/recovery', { method: 'POST', body: new URLSearchParams({ email: 'p1d2-synthetic-a@example.invalid' }) }))
  assert.equal(recovery.status, 202)
  assert.deepEqual(await recovery.json(), { status: 'accepted' })
  const foreignLogout = await logoutPost(new NextRequest('https://app.p1d2.invalid/auth/logout', { method: 'POST', headers: { origin: 'https://attacker.invalid' } }))
  assert.equal(foreignLogout.status, 403)
  assert.equal(foreignLogout.headers.get('cache-control'), 'no-store')
})
