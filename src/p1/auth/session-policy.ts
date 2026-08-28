/**
 * P1-D2B security contract: session policy is a guard, not business authorization.
 * Tenant, role, membership, and capability remain internal server/database authority.
 */
export type AssuranceLevel = 'aal1' | 'aal2'
export type SafeAuthError = 'AuthenticationRequired' | 'AccessDenied' | 'DependencyUnavailable' | 'IntegrityFailure'

const LOCAL_PATH = /^\/(?!\/)[^\\\r\n]*$/
const hasTraversal = (value: string): boolean => /(?:^|\/)\.\.(?:\/|$)/.test(value)

export function resolveSafeLocalPath(candidate: unknown, fallback: string): string {
  if (typeof fallback !== 'string' || !LOCAL_PATH.test(fallback) || hasTraversal(fallback)) throw new Error('IntegrityFailure')
  if (typeof candidate !== 'string') return fallback
  let decoded: string
  try { decoded = decodeURIComponent(candidate) } catch { return fallback }
  if (!LOCAL_PATH.test(candidate) || !LOCAL_PATH.test(decoded) || hasTraversal(candidate) || hasTraversal(decoded)) return fallback
  return candidate
}

export function requireAal(observed: AssuranceLevel, required: AssuranceLevel): void {
  if (required === 'aal2' && observed !== 'aal2') throw new Error('AccessDenied')
}

export function genericRecoveryResponse(): Readonly<{ status: 'accepted' }> { return { status: 'accepted' } }

export function publicAuthFailure(error: unknown): SafeAuthError {
  if (error instanceof Error && error.message === 'DependencyUnavailable') return 'DependencyUnavailable'
  if (error instanceof Error && error.message === 'IntegrityFailure') return 'IntegrityFailure'
  if (error instanceof Error && error.message === 'AccessDenied') return 'AccessDenied'
  return 'AuthenticationRequired'
}
