import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '@/src/p1/auth/supabase-server-client'
import { deriveProviderBackedSecurityContext } from '@/src/p1/authorization/provider-backed-context'
import { createProviderBackedRepository } from '@/src/p1/authorization/provider-backed-runtime'
import { createP2Repository } from '@/src/p2/runtime'
import { createRequest, listMyRequests } from '@/src/p2/service'

function requestId(request: NextRequest): string {
  const supplied = request.headers.get('x-request-id')
  if (supplied && /^[A-Za-z0-9_-]{1,64}$/.test(supplied)) return supplied
  return crypto.randomUUID()
}

function response(body: unknown, status: number) {
  return NextResponse.json(body, { status })
}

async function resolveContext(request: NextRequest) {
  const cookieStore = await cookies()
  const config = loadSupabasePublicConfig()
  const client = createSupabaseServerClient(cookieStore)
  const identityRepository = createProviderBackedRepository()
  try {
    return await deriveProviderBackedSecurityContext({
      auth: client.auth,
      policy: { issuer: config.issuer, audience: config.audience, nowSeconds: () => Math.floor(Date.now() / 1000), clockSkewSeconds: 30 },
      store: identityRepository,
      requestId: requestId(request),
    })
  } finally {
    await identityRepository.close().catch(() => undefined)
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveContext(request)
    const repository = createP2Repository()
    try {
      const result = await listMyRequests(repository, context)
      if (!result.ok) return response({ error: { code: 'Denied' } }, 403)
      return response({ requests: result.value }, 200)
    } finally {
      await repository.close().catch(() => undefined)
    }
  } catch {
    return response({ error: { code: 'Denied' } }, 403)
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveContext(request)
    const body = await request.json().catch(() => undefined)
    if (!body || typeof body.title !== 'string' || typeof body.summary !== 'string' || typeof body.idempotencyKey !== 'string') {
      return response({ error: { code: 'ValidationError' } }, 400)
    }
    const repository = createP2Repository()
    try {
      const result = await createRequest(repository, context, { id: crypto.randomUUID(), title: body.title, summary: body.summary, idempotencyKey: body.idempotencyKey })
      if (!result.ok) return response({ error: { code: result.error === 'VALIDATION_ERROR' ? 'ValidationError' : 'Denied' } }, result.error === 'VALIDATION_ERROR' ? 400 : 403)
      return response({ request: result.value.request, duplicate: result.value.duplicate }, result.value.duplicate ? 200 : 201)
    } finally {
      await repository.close().catch(() => undefined)
    }
  } catch {
    return response({ error: { code: 'Denied' } }, 403)
  }
}
