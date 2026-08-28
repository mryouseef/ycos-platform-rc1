/**
 * P1-D2B security contract: Proxy refreshes request cookies only.
 * It does not authorize roles, memberships, tenants, resources, or database access.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/src/p1/auth/supabase-server-client'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  try {
    const client = createSupabaseServerClient({
      getAll: () => request.cookies.getAll(),
      set: (name, value, options) => {
        request.cookies.set(name, value)
        response.cookies.set(name, value, options)
      },
    })
    await client.auth.getClaims()
  } catch { /* Anonymous and dependency-failure paths remain fail-closed at protected server boundaries. */ }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.headers.append('Vary', 'Cookie')
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|healthz).*)'] }
