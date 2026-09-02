'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '../p1/auth/supabase-server-client'
import { deriveProviderBackedSecurityContext } from '../p1/authorization/provider-backed-context'
import { createProviderBackedRepository } from '../p1/authorization/provider-backed-runtime'
import { createP2Repository } from './runtime'
import { createRequest, submitRequest, withdrawRequest, startReview, acceptRequest, declineRequest, establishConsultation, assignConsultant, activateConsultation, pauseConsultation, completeConsultation } from './service'

export type P2CommandState = { status: 'idle' | 'success' | 'deny' | 'conflict' | 'validation'; message: string }

const copy = (locale: string, code: string) =>
  ({
    success: locale === 'ar' ? 'تم تنفيذ الأمر وتحديث الحالة.' : 'Command completed and state updated.',
    conflict: locale === 'ar' ? 'تعارض إصدار. حدّث الصفحة ثم أعد المحاولة.' : 'Version conflict. Refresh and retry.',
    validation: locale === 'ar' ? 'تحقق من الحقول المطلوبة.' : 'Check the required fields.',
    deny: locale === 'ar' ? 'هذا الإجراء غير متاح ضمن سياقك الحالي.' : 'This action is not available in your current context.',
  })[code] ?? (locale === 'ar' ? 'العملية غير متاحة.' : 'Operation unavailable.')

async function resolveContext(requestId: string) {
  const cookieStore = await cookies()
  const config = loadSupabasePublicConfig()
  const client = createSupabaseServerClient(cookieStore)
  const identityRepository = createProviderBackedRepository()
  try {
    return await deriveProviderBackedSecurityContext({
      auth: client.auth,
      policy: { issuer: config.issuer, audience: config.audience, nowSeconds: () => Math.floor(Date.now() / 1000), clockSkewSeconds: 30 },
      store: identityRepository,
      requestId,
    })
  } finally {
    await identityRepository.close().catch(() => undefined)
  }
}

function toState(locale: string, outcome: { ok: true } | { ok: false; error: string }): P2CommandState {
  if (outcome.ok) return { status: 'success', message: copy(locale, 'success') }
  const status = outcome.error === 'VERSION_CONFLICT' || outcome.error === 'ALREADY_ESTABLISHED' ? 'conflict' : outcome.error === 'VALIDATION_ERROR' ? 'validation' : 'deny'
  return { status, message: copy(locale, status) }
}

export async function createRequestAction(_: P2CommandState, form: FormData): Promise<P2CommandState> {
  const locale = form.get('locale') === 'en' ? 'en' : 'ar'
  const title = String(form.get('title') ?? '').trim()
  const summary = String(form.get('summary') ?? '').trim()
  const idempotencyKey = String(form.get('idempotencyKey') ?? '')
  if (!idempotencyKey) return { status: 'validation', message: copy(locale, 'validation') }
  try {
    const context = await resolveContext(idempotencyKey)
    const repository = createP2Repository()
    try {
      const outcome = await createRequest(repository, context, { id: crypto.randomUUID(), title, summary, idempotencyKey })
      revalidatePath(`/${locale}/portal/requests`)
      return toState(locale, outcome)
    } finally {
      await repository.close().catch(() => undefined)
    }
  } catch {
    return { status: 'deny', message: copy(locale, 'deny') }
  }
}

export async function transitionRequestAction(_: P2CommandState, form: FormData): Promise<P2CommandState> {
  const locale = form.get('locale') === 'en' ? 'en' : 'ar'
  const id = String(form.get('id') ?? '')
  const action = String(form.get('action') ?? '')
  const expectedVersion = Number(form.get('version'))
  if (!id || !Number.isFinite(expectedVersion)) return { status: 'validation', message: copy(locale, 'validation') }
  try {
    const context = await resolveContext(`p2-${id}-${action}`)
    const repository = createP2Repository()
    try {
      const outcome =
        action === 'submit' ? await submitRequest(repository, context, id, expectedVersion)
        : action === 'withdraw' ? await withdrawRequest(repository, context, id, expectedVersion)
        : action === 'review' ? await startReview(repository, context, id, expectedVersion)
        : action === 'accept' ? await acceptRequest(repository, context, id, expectedVersion)
        : action === 'decline' ? await declineRequest(repository, context, id, expectedVersion)
        : action === 'establish' ? await establishConsultation(repository, context, { id: crypto.randomUUID(), requestId: id })
        : { ok: false as const, error: 'ACTION_NOT_AUTHORIZED' as const }
      revalidatePath(`/${locale}/portal/requests`)
      return toState(locale, outcome)
    } finally {
      await repository.close().catch(() => undefined)
    }
  } catch {
    return { status: 'deny', message: copy(locale, 'deny') }
  }
}

export async function transitionConsultationAction(_: P2CommandState, form: FormData): Promise<P2CommandState> {
  const locale = form.get('locale') === 'en' ? 'en' : 'ar'
  const id = String(form.get('id') ?? '')
  const action = String(form.get('action') ?? '')
  const expectedVersion = Number(form.get('version'))
  const consultantMembershipId = String(form.get('consultantMembershipId') ?? '')
  if (!id || !Number.isFinite(expectedVersion)) return { status: 'validation', message: copy(locale, 'validation') }
  if (action === 'assign' && !consultantMembershipId) return { status: 'validation', message: copy(locale, 'validation') }
  try {
    const context = await resolveContext(`p2-${id}-${action}`)
    const repository = createP2Repository()
    try {
      const outcome =
        action === 'assign' ? await assignConsultant(repository, context, id, expectedVersion, consultantMembershipId)
        : action === 'activate' ? await activateConsultation(repository, context, id, expectedVersion)
        : action === 'pause' ? await pauseConsultation(repository, context, id, expectedVersion)
        : action === 'complete' ? await completeConsultation(repository, context, id, expectedVersion)
        : { ok: false as const, error: 'ACTION_NOT_AUTHORIZED' as const }
      revalidatePath(`/${locale}/portal/consultant`)
      revalidatePath(`/${locale}/portal/requests`)
      return toState(locale, outcome)
    } finally {
      await repository.close().catch(() => undefined)
    }
  } catch {
    return { status: 'deny', message: copy(locale, 'deny') }
  }
}
