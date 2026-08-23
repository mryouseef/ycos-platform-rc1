/** YCOS M-02 design: high-contrast navy surfaces, gold rules, and an editorial asymmetric layout define the shared public shell. */
import { PublicLink as Link } from "@/components/public-link";
import { LocaleDocument } from "@/components/locale-document";
import { MobileNav } from "@/components/mobile-nav";
import { getCopy, localePath, oppositeLocale, type Locale } from "@/src/lib/site-data";

const navKeys = ["about", "services", "methodology", "sectors", "insights"] as const;
const suffixes: Record<(typeof navKeys)[number], string> = { about: "/about", services: "/services", methodology: "/methodology", sectors: "/sectors", insights: "/insights" };

export function PublicShell({ locale, currentSuffix = "", children }: { locale: Locale; currentSuffix?: string; children: React.ReactNode }) {
  const copy = getCopy(locale);
  const alternate = oppositeLocale(locale);
  const navItems = navKeys.map((key) => ({ href: localePath(locale, suffixes[key]), label: copy.nav[key] }));
  const languageHref = localePath(alternate, currentSuffix);
  return (
    <div className="site-frame" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <LocaleDocument locale={locale} />
      <a className="skip-link" href="#main-content">{locale === "ar" ? "تجاوز إلى المحتوى" : "Skip to content"}</a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href={localePath(locale)} aria-label="YCOS">
            <span className="brand__glyph" aria-hidden="true">Y</span>
            <span className="brand__type"><b>YCOS</b><small>{locale === "ar" ? "منصة استراتيجية" : "Strategic platform"}</small></span>
          </Link>
          <nav className="desktop-nav" aria-label={copy.ui.menuLabel}>{navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
          <div className="header-actions">
            <Link className="language-link" href={languageHref} hrefLang={alternate} lang={alternate}>{copy.ui.switchLanguage}</Link>
            <Link className="header-cta" href={localePath(locale, "/request-consultation")}>{copy.nav.request}</Link>
          </div>
          <MobileNav locale={locale} items={[...navItems, { href: localePath(locale, "/contact"), label: copy.nav.contact }, { href: localePath(locale, "/request-consultation"), label: copy.nav.request }, { href: localePath(locale, "/login"), label: copy.nav.portal }]} menuLabel={copy.ui.menuLabel} menuText={copy.ui.menu} closeText={copy.ui.close} />
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="shell footer-grid">
          <div><span className="footer-mark">YCOS</span><p>{copy.footer.statement}</p></div>
          <div className="footer-links"><Link href={localePath(locale, "/privacy")}>{locale === "ar" ? "الخصوصية" : "Privacy"}</Link><Link href={localePath(locale, "/terms")}>{locale === "ar" ? "الشروط" : "Terms"}</Link><Link href={localePath(locale, "/login")}>{copy.nav.portal}</Link></div>
          <div className="footer-notice"><span>{copy.footer.legal}</span><small>{copy.footer.development}</small></div>
        </div>
      </footer>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{lede}</p></div>;
}

export function Breadcrumbs({ locale, parent, current }: { locale: Locale; parent: { label: string; href: string }; current: string }) {
  return <nav className="breadcrumbs" aria-label={locale === "ar" ? "مسار التصفح" : "Breadcrumbs"}><Link href={localePath(locale)}>{locale === "ar" ? "الرئيسية" : "Home"}</Link><span aria-hidden="true">/</span><Link href={parent.href}>{parent.label}</Link><span aria-hidden="true">/</span><b>{current}</b></nav>;
}
