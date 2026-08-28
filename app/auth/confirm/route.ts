/** P1-D2B: confirmation/recovery artifact boundary; one provider verification then local safe redirect. */
import { NextRequest, NextResponse } from 'next/server'
import { completeConfirmation } from '@/src/p1/auth/supabase-auth-adapter'
import { resolveSafeLocalPath } from '@/src/p1/auth/session-policy'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '@/src/p1/auth/supabase-server-client'

export async function GET(request: NextRequest) {
  try {
    const config = loadSupabasePublicConfig()
    const fallback = request.nextUrl.searchParams.get('type') === 'recovery' ? '/ar/reset-password' : '/ar/login?status=confirmed'
    const response = NextResponse.redirect(new URL(resolveSafeLocalPath(request.nextUrl.searchParams.get('next'), fallback), config.callbackBaseUrl))
    const client = createSupabaseServerClient({ getAll: () => request.cookies.getAll(), set: (name, value, options) => response.cookies.set(name, value, options) })
    await completeConfirmation(client.auth, request.nextUrl.searchParams.get('type'), request.nextUrl.searchParams.get('token_hash'))
    return response
  } catch { return new NextResponse(null, { status: 401, headers: { 'Cache-Control': 'no-store' } }) }
}
