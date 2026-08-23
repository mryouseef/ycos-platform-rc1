/** YCOS M-02: metadata uses a synthetic placeholder base; no production domain is asserted. */
import type { Metadata } from "next";
import type { Locale } from "@/src/lib/site-data";
import { oppositeLocale } from "@/src/lib/site-data";
const metadataBase = new URL("https://ycos.example");
export function pageMetadata(locale: Locale, suffix: string, title: string, description: string, noIndex = false): Metadata {
  const alternate = oppositeLocale(locale);
  return { metadataBase, title: `${title} | YCOS`, description, alternates: { canonical: `/${locale}${suffix}`, languages: { ar: `/ar${suffix}`, en: `/en${suffix}` } }, openGraph: { type: "website", locale: locale === "ar" ? "ar_SA" : "en_US", title: `${title} | YCOS`, description, url: `/${locale}${suffix}`, siteName: "YCOS" }, robots: noIndex ? { index: false, follow: false } : { index: true, follow: true }, other: { "x-ycos-metadata": `synthetic-${alternate}` } };
}
