import { cookies } from 'next/headers'
import { createSupabaseServerClient, loadSupabasePublicConfig } from '../p1/auth/supabase-server-client'
import { deriveProviderBackedSecurityContext } from '../p1/authorization/provider-backed-context'
import { createProviderBackedRepository } from '../p1/authorization/provider-backed-runtime'
import { createP2Repository } from './runtime'
import { listMyConsultations } from './service'
import { ConsultationsPanel } from './consultations-panel'

export async function P2ConsultantPage({ locale }: { locale: string }) {
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
      </main>
    )
  }

  const repository = createP2Repository()
  try {
    const list = await listMyConsultations(repository, context)
    const rows = list.ok ? list.value : []
    return (
      <main className="page-main portal-workspace" dir={rtl ? 'rtl' : 'ltr'}>
        <header className="portal-workspace__header"><b>YCOS</b><span>P2 · CORE CONSULTING WORKFLOW</span></header>
        <section className="section">
          <div className="shell section-heading">
            <h1>{rtl ? 'استشاراتي المُسنَدة' : 'My assigned consultations'}</h1>
          </div>
          <div className="shell">
            {rows.length === 0 ? (
              <p>{rtl ? 'لا توجد استشارات مُسنَدة إليك حاليًا.' : 'No consultations are currently assigned to you.'}</p>
            ) : (
              <ConsultationsPanel locale={rtl ? 'ar' : 'en'} rows={rows} isManager={context.roles.includes('ROLE-05')} />
            )}
          </div>
        </section>
      </main>
    )
  } finally {
    await repository.close().catch(() => undefined)
  }
}
