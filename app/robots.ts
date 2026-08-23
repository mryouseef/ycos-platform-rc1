import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/ar", "/en"], disallow: ["/ar/login", "/en/login", "/ar/portal", "/en/portal", "/ar/admin", "/en/admin"] }, sitemap: "https://ycos.example/sitemap.xml" }; }
