/** P1-D2B: POST-only logout clears local cookies and invokes provider local sign-out without disclosing session material. */
import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/src/p1/auth/supabase-auth-adapter'
import { createSupabaseServerClient } from '@/src/p1/auth/supabase-server-client'

const sameOrigin = (request: NextRequest) => request.headers.get('origin') === request.nextUrl.origin

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  const response = NextResponse.json({ status: 'signed-out' }, { headers: { 'Cache-Control': 'no-store' } })
  try {
    const client = createSupabaseServerClient({ getAll: () => request.cookies.getAll(), set: (name, value, options) => response.cookies.set(name, value, options) })
    await logout(client.auth)
  } catch { /* Local response remains non-cacheable; protected routes still fail closed after client cookie clearing. */ }
  for (const cookie of request.cookies.getAll()) if (cookie.name.startsWith('sb-')) response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
  return response
}
