/**
 * P1-D2B security contract: Supabase authenticates; YCOS authorizes.
 * The adapter accepts verified identity and assurance only; it never derives tenant, role, membership, permission, or database context.
 */
import type { AssuranceLevel } from './session-policy'

type ClaimRecord = Readonly<Record<string, unknown>>
type AuthResult<T> = Promise<Readonly<{ data?: T | null; error: unknown | null }>>
export type ProviderIdentity = Readonly<{ providerIssuer: string; providerSubject: string; assuranceLevel: AssuranceLevel; sessionId: string }>
export type PasswordCredentials = Readonly<{ email: string; password: string }>
export type ConfirmationType = 'signup' | 'recovery'

export type SupabaseAuthPort = Readonly<{
  getClaims: () => AuthResult<{ claims?: ClaimRecord }>
  signInWithPassword: (credentials: PasswordCredentials) => AuthResult<unknown>
  exchangeCodeForSession: (code: string) => AuthResult<unknown>
  verifyOtp: (input: Readonly<{ token_hash: string; type: ConfirmationType }>) => AuthResult<unknown>
  resetPasswordForEmail: (email: string, options: Readonly<{ redirectTo: string }>) => AuthResult<unknown>
  signOut: (options: Readonly<{ scope: 'local' }>) => AuthResult<unknown>
}>

export type IdentityValidationPolicy = Readonly<{ issuer: string; audience: string; nowSeconds: () => number; clockSkewSeconds: number }>

const text = (value: unknown): string | null => typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
const audienceMatches = (audience: unknown, expected: string) => Array.isArray(audience) ? audience.includes(expected) : audience === expected
const fail = (message: 'AuthenticationRequired' | 'DependencyUnavailable'): never => { throw new Error(message) }
const isAssuranceLevel = (value: unknown): value is AssuranceLevel => value === 'aal1' || value === 'aal2'
const requiredText = (value: unknown): string => {
  const normalized = text(value)
  if (!normalized) throw new Error('AuthenticationRequired')
  return normalized
}
const requiredConfirmationType = (value: unknown): ConfirmationType => {
  if (value !== 'signup' && value !== 'recovery') throw new Error('AuthenticationRequired')
  return value
}
const requiredAssuranceLevel = (value: unknown): AssuranceLevel => {
  if (!isAssuranceLevel(value)) throw new Error('AuthenticationRequired')
  return value
}

export async function validateIdentity(auth: SupabaseAuthPort, policy: IdentityValidationPolicy): Promise<ProviderIdentity> {
  const result = await auth.getClaims()
  const claims = result.data?.claims
  if (result.error || !claims) throw new Error('AuthenticationRequired')
  const verifiedClaims: ClaimRecord = claims
  const issuer = requiredText(verifiedClaims.iss)
  const subject = requiredText(verifiedClaims.sub)
  const sessionId = requiredText(verifiedClaims.session_id)
  const assuranceLevel = requiredAssuranceLevel(verifiedClaims.aal)
  const expiry = verifiedClaims.exp
  const notBefore = verifiedClaims.nbf
  if (issuer !== policy.issuer || !audienceMatches(verifiedClaims.aud, policy.audience)) fail('AuthenticationRequired')
  if (typeof expiry !== 'number' || !Number.isFinite(expiry) || expiry <= policy.nowSeconds() - policy.clockSkewSeconds) fail('AuthenticationRequired')
  if (notBefore !== undefined && (typeof notBefore !== 'number' || !Number.isFinite(notBefore) || notBefore > policy.nowSeconds() + policy.clockSkewSeconds)) fail('AuthenticationRequired')
  if (verifiedClaims.role !== 'authenticated') fail('AuthenticationRequired')
  return { providerIssuer: issuer, providerSubject: subject, assuranceLevel, sessionId }
}

export async function startLogin(auth: SupabaseAuthPort, credentials: PasswordCredentials): Promise<void> {
  if (!text(credentials.email) || !text(credentials.password)) fail('AuthenticationRequired')
  const result = await auth.signInWithPassword(credentials)
  if (result.error) fail('AuthenticationRequired')
}

export async function completeCallback(auth: SupabaseAuthPort, code: unknown): Promise<void> {
  const value = requiredText(code)
  const result = await auth.exchangeCodeForSession(value)
  if (result.error) fail('AuthenticationRequired')
}

export async function completeConfirmation(auth: SupabaseAuthPort, type: unknown, tokenHash: unknown): Promise<void> {
  const token = requiredText(tokenHash)
  const confirmationType = requiredConfirmationType(type)
  const result = await auth.verifyOtp({ token_hash: token, type: confirmationType })
  if (result.error) fail('AuthenticationRequired')
}

export async function beginRecovery(auth: SupabaseAuthPort, email: unknown, redirectTo: string): Promise<void> {
  const address = text(email)
  if (!address || !address.includes('@')) return
  const result = await auth.resetPasswordForEmail(address, { redirectTo })
  if (result.error) return
}

export async function logout(auth: SupabaseAuthPort): Promise<void> {
  const result = await auth.signOut({ scope: 'local' })
  if (result.error) fail('DependencyUnavailable')
}
