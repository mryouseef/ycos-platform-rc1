import { cookies } from 'next/headers'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '../p1/auth/supabase-server-client'
import { deriveProviderBackedSecurityContext } from '../p1/authorization/provider-backed-context'
import { createProviderBackedRepository } from '../p1/authorization/provider-backed-runtime'
import { createP2Repository } from './runtime'
import { listMyRequests, readRequest, readConsultationForRequest, readClientTimeline, listManagerConsultationSummary } from './service'
import { RequestsPanel } from './requests-panel'

const consultationStateLabels: Record<'ar' | 'en', Record<string, string>> = {
  ar: { PROPOSED: 'قيد التأسيس', ACTIVE: 'جارية', PAUSED: 'مُتوقّفة مؤقتًا', COMPLETED: 'مُكتملة', CLOSED: 'مُغلَقة' },
  en: { PROPOSED: 'Proposed', ACTIVE: 'Active', PAUSED: 'Paused', COMPLETED: 'Completed', CLOSED: 'Closed' },
}

// P3-C: request-state labels, following the exact same fixed-map pattern as
// consultationStateLabels above (no equivalent map existed to reuse for request states).
const requestStateLabels: Record<'ar' | 'en', Record<string, string>> = {
  ar: { DRAFT: 'مسودة', SUBMITTED: 'مُرسَل', REVIEW: 'قيد المراجعة', ACCEPTED: 'مقبول', DECLINED: 'مرفوض', WITHDRAWN: 'مسحوب', CLOSED: 'مُغلَق' },
  en: { DRAFT: 'Draft', SUBMITTED: 'Submitted', REVIEW: 'In review', ACCEPTED: 'Accepted', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn', CLOSED: 'Closed' },
}

const NOT_STARTED_LABEL: Record<'ar' | 'en', string> = { ar: 'لم تبدأ الاستشارة بعد', en: 'Consultation not started' }
const UNSUPPORTED_LABEL: Record<'ar' | 'en', string> = { ar: 'حالة غير معروفة', en: 'Unrecognized state' }

/** P3-C: manager-only tenant-wide operational summary. Renders NOTHING beyond the approved
 * ManagerConsultationSummary shape — no id, tenantId, or any membership identifier ever
 * reaches this component's props or output. requestId exists only as a React list key, never
 * rendered as visible text. Unmapped state values fail closed to a fixed generic label,
 * never a raw state string. */
async function ManagerSummary({ repository, context, locale }: { repository: import('./repository').P2PostgresRepository; context: import('../pn01/contracts').SecurityContext; locale: 'ar' | 'en' }) {
  const result = await listManagerConsultationSummary(repository, context)
  if (!result.ok) return null
  return (
    <section className="manager-summary">
      <h2>{locale === 'ar' ? 'ملخّص تشغيلي' : 'Operational summary'}</h2>
      {result.value.length === 0 ? (
        <p>{locale === 'ar' ? 'لا توجد طلبات في مستأجرك بعد.' : 'No requests in your tenant yet.'}</p>
      ) : (
        <table>
          <tbody>
            {result.value.map((row) => (
              <tr key={row.requestId}>
                <td>{row.requestTitle}</td>
                <td>{requestStateLabels[locale][row.requestState] ?? UNSUPPORTED_LABEL[locale]}</td>
                <td>
                  {row.consultationState === null
                    ? NOT_STARTED_LABEL[locale]
                    : (consultationStateLabels[locale][row.consultationState] ?? UNSUPPORTED_LABEL[locale])}
                </td>
                <td>{row.consultationVersion ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/** P3-A: shows ONLY the authoritative consultation state, nothing else — no internal
 * membership ids, no version, no manager/consultant identifiers. Renders nothing when no
 * consultation exists yet or the viewer is not authorized to see it — that absence is a
 * normal, expected state (e.g. the request has not been accepted yet), not an error. */
async function ConsultationStatusNote({ repository, context, requestId, locale }: { repository: import('./repository').P2PostgresRepository; context: import('../pn01/contracts').SecurityContext; requestId: string; locale: 'ar' | 'en' }) {
  const result = await readConsultationForRequest(repository, context, requestId)
  if (!result.ok) return null
  const label = consultationStateLabels[locale][result.value.state] ?? result.value.state
  return (
    <p className="consultation-status-note">
      {locale === 'ar' ? 'حالة الاستشارة: ' : 'Consultation status: '}
      <strong>{label}</strong>
    </p>
  )
}

/** P3-B: renders ONLY the fixed-label client-safe timeline projection — never a raw action,
 * outcome, reason_code, or any identifier. Empty state is safe/expected (a new request with
 * no client-meaningful lifecycle events yet). Reuses readClientTimeline's existing P3-A
 * authorization chain — no separate visibility gate here that could diverge from it. */
async function ClientTimeline({ repository, context, requestId, locale }: { repository: import('./repository').P2PostgresRepository; context: import('../pn01/contracts').SecurityContext; requestId: string; locale: 'ar' | 'en' }) {
  const result = await readClientTimeline(repository, context, requestId, locale)
  if (!result.ok) return null
  return (
    <section className="request-timeline">
      <h2>{locale === 'ar' ? 'سجل الحالة' : 'Status timeline'}</h2>
      {result.value.length === 0 ? (
        <p>{locale === 'ar' ? 'لا توجد أحداث بعد.' : 'No events yet.'}</p>
      ) : (
        <ol>
          {result.value.map((entry, index) => (
            <li key={index}>
              <span>{entry.label}</span>
              <time dateTime={entry.occurredAt}>{entry.occurredAt}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export async function P2RequestsPage({ locale, id }: { locale: string; id?: string }) {
  const rtl = locale === 'ar'
  let context
  try {
    const cookieStore = await cookies()
    const config = loadSupabasePublicConfig()
    const client = createSupabaseServerClient(cookieStore)
    const identityRepository = createProviderBackedRepository()
    try {
      context = await deriveProviderBackedSecurityContext({
        auth: client.auth,
        policy: { issuer: config.issuer, audience: config.audience, nowSeconds: () => Math.floor(Date.now() / 1000), clockSkewSeconds: 30 },
        store: identityRepository,
        requestId: crypto.randomUUID(),
      })
    } finally {
      await identityRepository.close().catch(() => undefined)
    }
  } catch {
    return (
      <main className="page-main portal-workspace" dir={rtl ? 'rtl' : 'ltr'}>
        <span className="eyebrow">P2 · CORE CONSULTING WORKFLOW</span>
        <h1>{rtl ? 'الوصول غير متاح' : 'Access unavailable'}</h1>
        <p>{rtl ? 'يلزم تسجيل الدخول للوصول إلى طلبات الاستشارة.' : 'Sign in is required to access consulting requests.'}</p>
      </main>
    )
  }

  const repository = createP2Repository()
  try {
    const isClient = context.roles.includes('ROLE-02')
    const isManager = context.roles.includes('ROLE-05')
    if (id) {
      const result = await readRequest(repository, context, id)
      if (!result.ok) {
        return (
          <main className="page-main portal-workspace" dir={rtl ? 'rtl' : 'ltr'}>
            <span className="eyebrow">P2 · CORE CONSULTING WORKFLOW</span>
            <h1>{rtl ? 'غير موجود أو غير مصرَّح' : 'Not found or not authorized'}</h1>
          </main>
        )
      }
      return (
        <main className="page-main portal-workspace" dir={rtl ? 'rtl' : 'ltr'}>
          <header className="portal-workspace__header"><b>YCOS</b><span>P2 · CORE CONSULTING WORKFLOW</span></header>
          <div className="shell">
            <h1>{result.value.title}</h1>
            <p>{result.value.summary}</p>
            <ConsultationStatusNote repository={repository} context={context} requestId={id} locale={rtl ? 'ar' : 'en'} />
            <ClientTimeline repository={repository} context={context} requestId={id} locale={rtl ? 'ar' : 'en'} />
            <RequestsPanel locale={rtl ? 'ar' : 'en'} rows={[result.value]} isClient={isClient} isManager={isManager} />
          </div>
        </main>
      )
    }
    const list = await listMyRequests(repository, context)
    const rows = list.ok ? list.value : []
    return (
      <main className="page-main portal-workspace" dir={rtl ? 'rtl' : 'ltr'}>
        <header className="portal-workspace__header"><b>YCOS</b><span>P2 · CORE CONSULTING WORKFLOW</span></header>
        <section className="section">
          <div className="shell section-heading">
            <h1>{rtl ? 'طلبات الاستشارة' : 'Consulting requests'}</h1>
            <p>{rtl ? 'سير عمل حقيقي — بيانات اصطناعية فقط، محكوم بسلطة P1 الحقيقية.' : 'Real workflow — synthetic data only, governed by real P1 authority.'}</p>
          </div>
          {isManager && <div className="shell"><ManagerSummary repository={repository} context={context} locale={rtl ? 'ar' : 'en'} /></div>}
          <div className="shell">
            <RequestsPanel locale={rtl ? 'ar' : 'en'} rows={rows} isClient={isClient} isManager={isManager} />
          </div>
        </section>
      </main>
    )
  } finally {
    await repository.close().catch(() => undefined)
  }
}
