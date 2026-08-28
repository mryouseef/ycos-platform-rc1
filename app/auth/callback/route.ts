/** P1-D2B: PKCE code exchange boundary; no membership, tenant, role, or token logging. */
import { NextRequest, NextResponse } from 'next/server'
import { completeCallback } from '@/src/p1/auth/supabase-auth-adapter'
import { resolveSafeLocalPath } from '@/src/p1/auth/session-policy'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '@/src/p1/auth/supabase-server-client'

const failed = (base: string) => NextResponse.redirect(new URL('/ar/login?status=failed', base))

export async function GET(request: NextRequest) {
  try {
    const config = loadSupabasePublicConfig()
    const destination = resolveSafeLocalPath(request.nextUrl.searchParams.get('next'), '/ar/login?status=authenticated')
    const response = NextResponse.redirect(new URL(destination, config.callbackBaseUrl))
    const client = createSupabaseServerClient({ getAll: () => request.cookies.getAll(), set: (name, value, options) => response.cookies.set(name, value, options) })
    await completeCallback(client.auth, request.nextUrl.searchParams.get('code'))
    return response
  } catch {
    try { return failed(loadSupabasePublicConfig().callbackBaseUrl) } catch { return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
  }
}
