/** P1-D2B recovery entry: generic, non-enumerating browser surface with no business data or authority. */
import { notFound } from 'next/navigation'
import { isLocale } from '@/src/lib/site-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResetPasswordPage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const arabic = locale === 'ar'
  return <main dir={arabic ? 'rtl' : 'ltr'}><section className="page-main"><div className="shell page-content"><span className="eyebrow">YCOS / RECOVERY</span><h1>{arabic ? 'استرداد آمن للحساب الاصطناعي' : 'Secure synthetic-account recovery'}</h1><p>{arabic ? 'إذا كان العنوان مؤهلاً، فستصل تعليمات الاسترداد عبر المسار المعتمد. لا تكشف هذه الصفحة وجود أي حساب.' : 'If the address is eligible, recovery instructions will use the approved path. This page does not disclose whether an account exists.'}</p><form action="/auth/recovery" method="post"><label>{arabic ? 'البريد الاصطناعي' : 'Synthetic email'}<input dir="ltr" type="email" name="email" autoComplete="email" required /></label><button type="submit">{arabic ? 'طلب الاسترداد' : 'Request recovery'}</button></form></div></section></main>
}
