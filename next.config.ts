import type { NextConfig } from "next";

const developmentEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${developmentEval}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, { key: "Cross-Origin-Opener-Policy", value: "same-origin" }, { key: "Cross-Origin-Resource-Policy", value: "same-origin" }, { key: "X-Permitted-Cross-Domain-Policies", value: "none" }, { key: "X-DNS-Prefetch-Control", value: "off" }, { key: "Cache-Control", value: "no-store, max-age=0" }] }];
  },
};

export default nextConfig;
