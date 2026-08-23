/** YCOS M-02 design: locale boundary controls direction without duplicating the public shell. */
import { notFound } from "next/navigation";
import type { Locale } from "@/src/lib/site-data";
import { isLocale, locales } from "@/src/lib/site-data";

export const dynamicParams = false;
export function generateStaticParams() { return locales.map((locale) => ({ locale })); }
export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <div data-locale={locale as Locale}>{children}</div>; }
