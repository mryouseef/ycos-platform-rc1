/** YCOS M-02 design: public pages reuse a sober editorial system with gold structural rules rather than decorative clutter. */
import { PublicLink as Link } from "@/components/public-link";
import { DemoForm } from "@/components/demo-form";
import { Breadcrumbs, PublicShell, SectionHeading } from "@/components/site-shell";
import { getCopy, getInsight, localePath, type Locale, type RouteDefinition } from "@/src/lib/site-data";

function Mark({ index }: { index: number }) { return <span className="card-mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>; }
function Notice({ children }: { children: React.ReactNode }) { return <aside className="notice" role="note"><span>◈</span><p>{children}</p></aside>; }
function CardGrid({ cards, kind = "standard" }: { cards: { title: string; text: string; tag?: string }[]; kind?: "standard" | "services" | "steps" }) { return <div className={`card-grid card-grid--${kind}`}>{cards.map((card, index) => <article className="editorial-card" key={card.title}><Mark index={index} /><div>{card.tag ? <span className="card-tag">{card.tag}</span> : null}<h2>{card.title}</h2><p>{card.text}</p></div></article>)}</div>; }

export function HomePage({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  return <PublicShell locale={locale} currentSuffix=""><main id="main-content">
    <section className="hero">
      <div className="hero__lines" aria-hidden="true"><i /><i /><i /></div><div className="shell hero__grid"><div className="hero__copy"><span className="eyebrow">{copy.home.eyebrow}</span><h1>{copy.home.title} <em>{copy.home.highlight}</em></h1><p>{copy.home.lede}</p><div className="hero__actions"><Link className="button button--gold" href={localePath(locale, "/services")}>{copy.home.primary}</Link><Link className="text-link" href={localePath(locale, "/methodology")}>{copy.home.secondary}<span aria-hidden="true">←</span></Link></div></div><aside className="hero__proof"><span className="proof-kicker">YCOS / 02</span><h2>{copy.home.proofTitle}</h2><p>{copy.home.proofText}</p><div className="proof-grid"><span>01</span><span>02</span><span>03</span><span>04</span></div></aside></div>
    </section>
    <section className="section section--map-surface"><div className="shell"><div className="section-split"><div><span className="eyebrow">01 / {copy.nav.services}</span><h2>{copy.home.servicesTitle}</h2></div><p>{copy.home.servicesLead}</p></div><CardGrid cards={copy.services.cards.slice(0, 4)} kind="services" /><Link className="section-link" href={localePath(locale, "/services")}>{copy.ui.allServices}<span aria-hidden="true">↙</span></Link></div></section>
    <section className="section section--ink"><div className="shell methodology-preview"><div className="methodology-copy"><span className="eyebrow">02 / {copy.nav.methodology}</span><h2>{copy.home.methodologyTitle}</h2><p>{copy.home.methodologyLead}</p><Link className="button button--outline" href={localePath(locale, "/methodology")}>{copy.home.secondary}</Link></div><CardGrid cards={copy.methodology.steps} kind="steps" /></div></section>
    <section className="section shell"><div className="section-split"><div><span className="eyebrow">03 / {copy.nav.insights}</span><h2>{copy.home.insightTitle}</h2></div><p>{copy.home.insightLead}</p></div><InsightGrid locale={locale} limit={3} /></section>
    <section className="shell cta-strip"><div><span className="eyebrow">YCOS / {copy.ui.demonstration}</span><h2>{locale === "ar" ? "مسار عام واضح، وحدود تشغيلية صريحة." : "A clear public path with explicit operational boundaries."}</h2></div><Link className="button button--gold" href={localePath(locale, "/request-consultation")}>{copy.nav.request}</Link></section>
  </main></PublicShell>;
}

function InsightGrid({ locale, limit }: { locale: Locale; limit?: number }) { const copy = getCopy(locale); const items = limit ? copy.insights.items.slice(0, limit) : copy.insights.items; return items.length ? <div className="insight-grid">{items.map((item, index) => <article className="insight-card" key={item.slug}><Mark index={index} /><span className="card-tag">{item.tag}</span><h2>{item.title}</h2><p>{item.excerpt}</p><Link href={localePath(locale, `/insights/${item.slug}`)}>{copy.ui.readInsight}<span aria-hidden="true">↙</span></Link></article>)}</div> : <div className="empty-state" role="status">{copy.insights.empty}</div>; }

export function PublicRoutePage({ locale, route }: { locale: Locale; route: RouteDefinition }) {
  const copy = getCopy(locale);
  const render = () => {
    if (route.key === "about") return <EditorialPage eyebrow={copy.about.eyebrow} title={copy.about.title} lede={copy.about.lede}><CardGrid cards={copy.about.cards} /></EditorialPage>;
    if (route.key === "services") return <EditorialPage eyebrow={copy.services.eyebrow} title={copy.services.title} lede={copy.services.lede}><CardGrid cards={copy.services.cards} kind="services" /><Notice>{locale === "ar" ? "المجالات المعروضة أمثلة تركيبية فقط، ولا تمثل عرضاً تعاقدياً أو خدمة مفعلة." : "The displayed domains are synthetic examples only and do not represent a contractual offer or activated service."}</Notice></EditorialPage>;
    if (route.key === "methodology") return <EditorialPage eyebrow={copy.methodology.eyebrow} title={copy.methodology.title} lede={copy.methodology.lede}><CardGrid cards={copy.methodology.steps} kind="steps" /></EditorialPage>;
    if (route.key === "sectors") return <EditorialPage eyebrow={copy.sectors.eyebrow} title={copy.sectors.title} lede={copy.sectors.lede}><CardGrid cards={copy.sectors.cards} /></EditorialPage>;
    if (route.key === "insights") return <EditorialPage eyebrow={copy.insights.eyebrow} title={copy.insights.title} lede={copy.insights.lede}><InsightGrid locale={locale} /></EditorialPage>;
    if (route.key === "insight" && route.slug) { const insight = getInsight(locale, route.slug); if (!insight) return null; return <main id="main-content"><article className="article shell"><Breadcrumbs locale={locale} parent={{ label: copy.nav.insights, href: localePath(locale, "/insights") }} current={insight.title} /><span className="eyebrow">{insight.tag}</span><h1>{insight.title}</h1><p className="article__lede">{insight.excerpt}</p><div className="article__body"><p>{insight.body}</p><Notice>{locale === "ar" ? "هذه الرؤية مادة تجريبية غير منسوبة إلى عميل أو مشروع أو نتيجة فعلية." : "This insight is a synthetic demonstration item with no client, project, or actual outcome attribution."}</Notice></div><Link className="text-link" href={localePath(locale, "/insights")}>{copy.ui.backToInsights}<span aria-hidden="true">←</span></Link></article></main>; }
    if (route.key === "contact") return <FormPage locale={locale} kind="contact" />;
    if (route.key === "consultation") return <FormPage locale={locale} kind="consultation" />;
    if (route.key === "privacy" || route.key === "terms") { const title = route.key === "privacy" ? copy.legal.privacyTitle : copy.legal.termsTitle; return <EditorialPage eyebrow={copy.ui.notice} title={title} lede={copy.legal.lede}><div className="legal-placeholder"><span>LEGAL REVIEW REQUIRED</span><p>{copy.legal.label}</p></div></EditorialPage>; }
    if (route.key === "login") return <EditorialPage eyebrow={copy.login.eyebrow} title={copy.login.title} lede={copy.login.lede}><div className="portal-placeholder"><span aria-hidden="true">⌁</span><p>{locale === "ar" ? "هذه واجهة احتياطية لا تصل إليها الأولوية المسارية للتسجيل الديناميكي." : "This fallback interface is superseded by the dynamic login route."}</p><Link className="button button--gold" href={localePath(locale)}>{copy.login.action}</Link></div></EditorialPage>;
    return null;
  };
  return <PublicShell locale={locale} currentSuffix={route.suffix}>{render()}</PublicShell>;
}

function EditorialPage({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: string; children: React.ReactNode }) { return <main id="main-content" className="page-main"><section className="page-hero"><div className="shell page-hero__inner"><SectionHeading eyebrow={eyebrow} title={title} lede={lede} /><div className="map-signal" aria-hidden="true"><i /><i /><i /><span>01</span><span>02</span></div></div></section><section className="shell section page-content">{children}</section></main>; }
function FormPage({ locale, kind }: { locale: Locale; kind: "contact" | "consultation" }) { const copy = getCopy(locale); const source = kind === "contact" ? copy.contact : copy.consultation; return <EditorialPage eyebrow={source.eyebrow} title={source.title} lede={source.lede}><div className="form-layout"><div><span className="eyebrow">{copy.ui.demonstration}</span><h2>{source.formTitle}</h2><p>{source.formLead}</p></div><DemoForm locale={locale} kind={kind} /></div></EditorialPage>; }
