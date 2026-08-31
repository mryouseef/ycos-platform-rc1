/**
 * P1-D2B security contract: request-scoped Supabase SSR client only.
 * No module-scoped user/session state, database access, service-role key, or business authorization.
 */
import { createServerClient } from '@supabase/ssr'

export type CookieRecord = Readonly<{ name: string; value: string; options?: Record<string, unknown> }>
export type RequestCookieStore = Readonly<{
  getAll: () => readonly CookieRecord[]
  set: (name: string, value: string, options?: Record<string, unknown>) => void
}>

export type SupabasePublicConfig = Readonly<{ url: string; publishableKey: string; issuer: string; audience: string; callbackBaseUrl: string }>

const required = (name: string): string => {
  const value = process.env[name]
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error('DependencyUnavailable')
  return value.trim()
}

const isApprovedOrigin = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')
  } catch { return false }
}

export function loadSupabasePublicConfig(): SupabasePublicConfig {
  const url = required('NEXT_PUBLIC_SUPABASE_URL')
  const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const issuer = required('SUPABASE_AUTH_ISSUER')
  const audience = required('SUPABASE_AUTH_AUDIENCE')
  const callbackBaseUrl = required('AUTH_CALLBACK_BASE_URL')
  if (!isApprovedOrigin(url) || !isApprovedOrigin(issuer) || !isApprovedOrigin(callbackBaseUrl)) throw new Error('IntegrityFailure')
  return { url, publishableKey, issuer, audience, callbackBaseUrl }
}

export function createSupabaseServerClient(cookieStore: RequestCookieStore) {
  const config = loadSupabasePublicConfig()
  try {
    return createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll: () => [...cookieStore.getAll()],
        setAll: (records) => records.forEach((record) => cookieStore.set(record.name, record.value, record.options as Record<string, unknown> | undefined)),
      },
    })
  } catch {
    // P1-D2CDE Q02 diagnostic seam: normalize any SDK client-construction failure to a
    // fixed, non-sensitive discriminant. The original error (which may carry provider
    // internals) is intentionally discarded here and never propagated.
    throw new Error('ClientInitFailure')
  }
}
