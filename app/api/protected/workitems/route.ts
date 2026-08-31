/** P1-D2C/D/E security contract: this provider-backed route accepts no client principal, tenant, role, or test header. */
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '@/src/p1/auth/supabase-server-client'
import { deriveProviderBackedSecurityContext } from '@/src/p1/authorization/provider-backed-context'
import { createProviderBackedRepository } from '@/src/p1/authorization/provider-backed-runtime'
import { ProviderBackedWorkItemService } from '@/src/iaf01/provider-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const response = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { 'cache-control': 'no-store', vary: 'Cookie' } })
const requestId = (request: NextRequest) => request.headers.get('x-request-id')?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || crypto.randomUUID()

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const config = loadSupabasePublicConfig()
    const client = createSupabaseServerClient(cookieStore)
    const repository = createProviderBackedRepository()
    try {
      const context = await deriveProviderBackedSecurityContext({ auth: client.auth, policy: { issuer: config.issuer, audience: config.audience, nowSeconds: () => Math.floor(Date.now() / 1000), clockSkewSeconds: 30 }, store: repository, requestId: requestId(request) })
      const itemId = request.nextUrl.searchParams.get('id')
      if (!itemId || !/^[A-Za-z0-9_-]+$/.test(itemId)) return response({ error: { code: 'Denied' } }, 403)
      const service = new ProviderBackedWorkItemService(repository)
      const result = await service.read(context, itemId)
      return response({ item: result }, 200)
    } finally { await repository.close().catch(() => undefined) }
  } catch (error) {
    const code = error instanceof Error && error.message === 'DependencyUnavailable' ? 'Unavailable' : 'Denied'
    return response({ error: { code } }, code === 'Unavailable' ? 503 : 403)
  }
}
