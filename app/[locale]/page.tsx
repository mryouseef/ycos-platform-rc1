/** YCOS M-02 design: asymmetric hero and modular editorial sections for the public home route. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/public-pages";
import { getCopy, isLocale } from "@/src/lib/site-data";
import { pageMetadata } from "@/src/lib/metadata";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const copy = getCopy(locale); return pageMetadata(locale, "", copy.home.title, copy.home.lede); }
export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <HomePage locale={locale} />; }
