'use client'

import { useActionState } from 'react'
import { createRequestAction, transitionRequestAction, type P2CommandState } from './actions'
import type { ConsultingRequest } from './domain'

const labels: Record<'ar' | 'en', Record<string, string>> = {
  ar: { submit: 'إرسال', withdraw: 'سحب', review: 'بدء المراجعة', accept: 'قبول', decline: 'رفض', establish: 'إنشاء الاستشارة', create: 'إنشاء طلب جديد', title: 'العنوان', summary: 'الملخص' },
  en: { submit: 'Submit', withdraw: 'Withdraw', review: 'Start review', accept: 'Accept', decline: 'Decline', establish: 'Establish consultation', create: 'Create new request', title: 'Title', summary: 'Summary' },
}

function actionsFor(role: { isClient: boolean; isManager: boolean }, state: string): string[] {
  if (role.isManager) {
    if (state === 'SUBMITTED') return ['review']
    if (state === 'REVIEW') return ['accept', 'decline']
    if (state === 'ACCEPTED') return ['establish']
    return []
  }
  if (role.isClient) {
    if (['SUBMITTED', 'REVIEW'].includes(state)) return ['withdraw']
    return []
  }
  return []
}

const initial: P2CommandState = { status: 'idle', message: '' }

export function RequestsPanel({ locale, rows, isClient, isManager }: { locale: 'ar' | 'en'; rows: ConsultingRequest[]; isClient: boolean; isManager: boolean }) {
  const [createState, createAction, creating] = useActionState(createRequestAction, initial)
  const [transitionState, transitionAction, transitioning] = useActionState(transitionRequestAction, initial)
  const l = labels[locale]
  return (
    <section className="command-panel">
      {createState.status !== 'idle' && <p className={`command-status command-status--${createState.status}`} aria-live="polite">{createState.message}</p>}
      {transitionState.status !== 'idle' && <p className={`command-status command-status--${transitionState.status}`} aria-live="polite">{transitionState.message}</p>}
      {isClient && (
        <form action={createAction} className="command-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="idempotencyKey" value={`req-${Date.now()}-${Math.random().toString(36).slice(2)}`} />
          <label>{l.title}<input name="title" maxLength={200} required /></label>
          <label>{l.summary}<textarea name="summary" maxLength={2000} required /></label>
          <button disabled={creating}>{l.create}</button>
        </form>
      )}
      {rows.map((row) => (
        <div className="command-row" key={row.id} data-request-id={row.id}>
          <span className="command-version">{row.state} · v{row.version}</span>
          <h3>{row.title}</h3>
          <p>{row.summary}</p>
          {actionsFor({ isClient, isManager }, row.state).map((action) => (
            <form action={transitionAction} key={action} style={{ display: 'inline' }}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="version" value={row.version} />
              <input type="hidden" name="action" value={action} />
              <button disabled={transitioning}>{l[action]}</button>
            </form>
          ))}
        </div>
      ))}
    </section>
  )
}
