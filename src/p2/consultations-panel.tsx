'use client'

import { useActionState } from 'react'
import { transitionConsultationAction, type P2CommandState } from './actions'
import type { Consultation } from './domain'

const labels: Record<'ar' | 'en', Record<string, string>> = {
  ar: { activate: 'تفعيل', pause: 'إيقاف مؤقت', complete: 'إكمال' },
  en: { activate: 'Activate', pause: 'Pause', complete: 'Complete' },
}

function actionsFor(state: string): string[] {
  if (state === 'PROPOSED') return ['activate']
  if (state === 'ACTIVE') return ['pause', 'complete']
  if (state === 'PAUSED') return ['activate']
  return []
}

const initial: P2CommandState = { status: 'idle', message: '' }

export function ConsultationsPanel({ locale, rows, isManager }: { locale: 'ar' | 'en'; rows: Consultation[]; isManager: boolean }) {
  const [state, action, pending] = useActionState(transitionConsultationAction, initial)
  const l = labels[locale]
  return (
    <section className="command-panel">
      {state.status !== 'idle' && <p className={`command-status command-status--${state.status}`} aria-live="polite">{state.message}</p>}
      {rows.map((row) => (
        <div className="command-row" key={row.id} data-consultation-id={row.id}>
          <span className="command-version">{row.state} · v{row.version}</span>
          {actionsFor(row.state).map((a) => (
            <form action={action} key={a} style={{ display: 'inline' }}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="version" value={row.version} />
              <input type="hidden" name="action" value={a} />
              <button disabled={pending}>{l[a]}</button>
            </form>
          ))}
          {isManager && !row.consultantMembershipId && (
            <form action={action} style={{ display: 'inline' }}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="version" value={row.version} />
              <input type="hidden" name="action" value="assign" />
              <input name="consultantMembershipId" placeholder={locale === 'ar' ? 'معرّف عضوية المستشار' : 'Consultant membership id'} required />
              <button disabled={pending}>{locale === 'ar' ? 'إسناد' : 'Assign'}</button>
            </form>
          )}
        </div>
      ))}
    </section>
  )
}
