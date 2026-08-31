/**
 * P1-D2CDE Q02 diagnostic seam: server-only, non-sensitive failure-layer classification.
 *
 * Security contract:
 * - This module never receives, stores, derives, or emits passwords, tokens, cookies,
 *   provider/internal UUIDs, publishable/secret keys, email addresses, tenant identifiers,
 *   raw provider errors, raw request bodies, or raw FormData.
 * - `logQ02Diagnostic` accepts ONLY a `Q02DiagnosticCategory` literal (enforced by the type
 *   system, not by convention), so no other value can ever reach its output sink.
 * - `classifyQ02Diagnostic` accepts the raw caught error but returns ONLY one of the five
 *   fixed category codes below; it never returns, logs, or forwards the error's message,
 *   stack, or any other property of the original error object.
 * - Output is written to the server process log only (console.error). It is never returned
 *   via query string, HTML, JSON response, response header, cookie, or redirect URL.
 *
 * This module performs NO authentication, authorization, or business-authority decision.
 * It does not change what is accepted or rejected; it only classifies, server-side, an
 * outcome that already occurred in supabase-server-client.ts / supabase-auth-adapter.ts.
 */

export type Q02DiagnosticCategory =
  | 'Q02_CONFIG_REJECTED'
  | 'Q02_CLIENT_INIT_REJECTED'
  | 'Q02_PROVIDER_AUTH_REJECTED'
  | 'Q02_AUTH_ACCEPTED'
  | 'Q02_UNEXPECTED_REJECTED'

/** Thrown by loadSupabasePublicConfig() in supabase-server-client.ts. */
const CONFIG_REJECTION_MESSAGES: ReadonlySet<string> = new Set(['DependencyUnavailable', 'IntegrityFailure'])

/** Thrown by createSupabaseServerClient()'s internal createServerClient() wrapper. */
const CLIENT_INIT_REJECTION_MESSAGES: ReadonlySet<string> = new Set(['ClientInitFailure'])

/**
 * Thrown by startLogin() in supabase-auth-adapter.ts — covers BOTH a genuine
 * signInWithPassword() provider rejection AND locally-empty submitted credentials
 * (both surface as the same 'AuthenticationRequired' message in the adapter today).
 * These two origins are not distinguishable without modifying supabase-auth-adapter.ts,
 * which is out of scope for this diagnostic; this ambiguity is intentional and documented,
 * not resolved by guessing.
 */
const PROVIDER_AUTH_REJECTION_MESSAGES: ReadonlySet<string> = new Set(['AuthenticationRequired'])

/**
 * Classifies a caught login-action error into one of five fixed, non-sensitive categories.
 * Any error whose message does not match a known, already-established throw-site contract
 * falls into Q02_UNEXPECTED_REJECTED — it is never guessed into a more specific bucket.
 */
export function classifyQ02Diagnostic(error: unknown): Q02DiagnosticCategory {
  if (error instanceof Error && CONFIG_REJECTION_MESSAGES.has(error.message)) return 'Q02_CONFIG_REJECTED'
  if (error instanceof Error && CLIENT_INIT_REJECTION_MESSAGES.has(error.message)) return 'Q02_CLIENT_INIT_REJECTED'
  if (error instanceof Error && PROVIDER_AUTH_REJECTION_MESSAGES.has(error.message)) return 'Q02_PROVIDER_AUTH_REJECTED'
  return 'Q02_UNEXPECTED_REJECTED'
}

/**
 * The ONLY sanctioned output sink for Q02 diagnostic categories. Server-side log line only.
 * The parameter type is a closed literal union, so no caller can pass an error object,
 * a message string, request data, or any other value through this function.
 */
export function logQ02Diagnostic(category: Q02DiagnosticCategory): void {
  console.error('[Q02_DIAGNOSTIC]', category)
}
