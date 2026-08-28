/** P1-D2B: recovery initiation returns a uniform response and never creates membership or authority. */
import { NextRequest, NextResponse } from 'next/server'
import { beginRecovery } from '@/src/p1/auth/supabase-auth-adapter'
import { genericRecoveryResponse } from '@/src/p1/auth/session-policy'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '@/src/p1/auth/supabase-server-client'

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const email = form?.get('email')
  try {
    const config = loadSupabasePublicConfig()
    const response = NextResponse.json(genericRecoveryResponse(), { status: 202, headers: { 'Cache-Control': 'no-store' } })
    const client = createSupabaseServerClient({ getAll: () => request.cookies.getAll(), set: (name, value, options) => response.cookies.set(name, value, options) })
    await beginRecovery(client.auth, email, new URL('/auth/confirm?type=recovery', config.callbackBaseUrl).toString())
    return response
  } catch { return NextResponse.json(genericRecoveryResponse(), { status: 202, headers: { 'Cache-Control': 'no-store' } }) }
}
