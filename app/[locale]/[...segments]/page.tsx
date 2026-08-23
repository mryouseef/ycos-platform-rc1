/** YCOS M-02 design: all approved public routes resolve to an editorial page system; no portal routes exist. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicRoutePage } from "@/components/public-pages";
import { getCopy, getInsight, isLocale, locales, publicRoutes, resolveRoute, siteCopy } from "@/src/lib/site-data";
import { pageMetadata } from "@/src/lib/metadata";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => [
    ...publicRoutes.filter((route) => route.suffix !== "").map((route) => ({ locale, segments: route.suffix.slice(1).split("/") })),
    ...siteCopy.en.insights.items.map((item) => ({ locale, segments: ["insights", item.slug] })),
  ]);
}
export async function generateMetadata({ params }: { params: Promise<{ locale: string; segments: string[] }> }): Promise<Metadata> { const { locale, segments } = await params; if (!isLocale(locale)) return {}; const route = resolveRoute(segments); if (!route) return {}; const copy = getCopy(locale); if (route.key === "insight" && route.slug) { const insight = getInsight(locale, route.slug); return insight ? pageMetadata(locale, route.suffix, insight.title, insight.excerpt) : {}; } const pageTitles: Record<Exclude<typeof route.key, "insight">, [string, string]> = { home: [copy.home.title, copy.home.lede], about: [copy.about.title, copy.about.lede], services: [copy.services.title, copy.services.lede], methodology: [copy.methodology.title, copy.methodology.lede], sectors: [copy.sectors.title, copy.sectors.lede], insights: [copy.insights.title, copy.insights.lede], contact: [copy.contact.title, copy.contact.lede], consultation: [copy.consultation.title, copy.consultation.lede], privacy: [copy.legal.privacyTitle, copy.legal.lede], terms: [copy.legal.termsTitle, copy.legal.lede], login: [copy.login.title, copy.login.lede] }; const [title, description] = pageTitles[route.key as Exclude<typeof route.key, "insight">]; return pageMetadata(locale, route.suffix, title, description, route.noIndex); }
export default async function DynamicPublicRoute({ params }: { params: Promise<{ locale: string; segments: string[] }> }) { const { locale, segments } = await params; if (!isLocale(locale)) notFound(); const route = resolveRoute(segments); if (!route) notFound(); return <PublicRoutePage locale={locale} route={route} />; }
