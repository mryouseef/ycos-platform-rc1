/* eslint-disable @next/next/no-html-link-for-pages -- static fallback deliberately avoids App Router context during prerender. */
/** YCOS M-02 design: a bilingual safe 404 surface with an explicit public escape route. */
export default function NotFound() { return <main className="not-found" lang="ar" dir="rtl"><span className="eyebrow">404</span><h1>الصفحة غير متاحة</h1><p>لم نعثر على المسار المطلوب في النسخة العامة الحالية.</p><a className="button button--gold" href="/ar">العودة للرئيسية</a></main>; }
