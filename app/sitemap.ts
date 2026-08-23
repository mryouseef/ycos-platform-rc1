import type { MetadataRoute } from "next";
import { locales, publicRoutes } from "@/src/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = publicRoutes
    .filter((route) => !route.noIndex)
    .flatMap((route) => locales.map((locale) => ({
      url: `https://ycos.example/${locale}${route.suffix}`,
      lastModified: new Date("2026-08-20"),
      changeFrequency: "monthly" as const,
      priority: route.key === "home" ? 1 : 0.7,
    })));
  const insightEntries = locales.flatMap((locale) => ["decision-architecture", "bilingual-clarity", "operating-models"].map((slug) => ({
    url: `https://ycos.example/${locale}/insights/${slug}`,
    lastModified: new Date("2026-08-20"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })));
  return [...staticEntries, ...insightEntries];
}
