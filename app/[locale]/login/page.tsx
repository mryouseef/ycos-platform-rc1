/** P1-D2B Arabic-first login entry: server action only; credentials never become tenant, role, membership, or client authority. */
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { startLogin } from '@/src/p1/auth/supabase-auth-adapter'
import { createSupabaseServerClient } from '@/src/p1/auth/supabase-server-client'
import { isLocale } from '@/src/lib/site-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LoginPage({ params }: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const arabic = locale === 'ar'
  const action = async (form: FormData) => {
    'use server'
    try {
      const store = await cookies()
      const client = createSupabaseServerClient({ getAll: () => store.getAll(), set: (name, value, options) => store.set(name, value, options) })
      await startLogin(client.auth, { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') })
    } catch { redirect(`/${locale}/login?status=failed`) }
    redirect(`/${locale}/login?status=authenticated`)
  }
  return <main dir={arabic ? 'rtl' : 'ltr'}><section className="page-main"><div className="shell page-content"><span className="eyebrow">YCOS / AUTHENTICATION</span><h1>{arabic ? 'دخول الحساب الاصطناعي المعتمد' : 'Sign in to the approved synthetic account'}</h1><p>{arabic ? 'المصادقة لا تمنح صلاحية مؤسسة أو دور أعمال. يثبت الخادم العضوية الفعالة قبل أي وصول محمي.' : 'Authentication does not grant organization or business-role authority. The server verifies active membership before protected access.'}</p><form action={action} method="post"><label>{arabic ? 'البريد الاصطناعي' : 'Synthetic email'}<input dir="ltr" type="email" name="email" autoComplete="email" required /></label><label>{arabic ? 'كلمة المرور' : 'Password'}<input dir="ltr" type="password" name="password" autoComplete="current-password" required /></label><button type="submit">{arabic ? 'متابعة آمنة' : 'Continue securely'}</button></form><a href={`/${locale}/reset-password`}>{arabic ? 'استرداد الوصول' : 'Recover access'}</a></div></section></main>
}
