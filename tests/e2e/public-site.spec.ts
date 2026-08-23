import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const finalScreenshots = "artifacts/m02/screenshots/final";
const publicPaths = [
  "/ar", "/en", "/ar/about", "/en/about", "/ar/services", "/en/services", "/ar/methodology", "/en/methodology",
  "/ar/sectors", "/en/sectors", "/ar/insights", "/en/insights", "/ar/insights/decision-architecture", "/en/insights/decision-architecture",
  "/ar/insights/bilingual-clarity", "/en/insights/bilingual-clarity", "/ar/insights/operating-models", "/en/insights/operating-models",
  "/ar/contact", "/en/contact", "/ar/request-consultation", "/en/request-consultation", "/ar/privacy", "/en/privacy", "/ar/terms", "/en/terms", "/ar/login", "/en/login",
];

function observe(page: Parameters<typeof test>[0] extends never ? never : any) {
  const consoleErrors: string[] = [];
  const asset404: string[] = [];
  const externalRequests: string[] = [];
  page.on("console", (message: { type: () => string; text: () => string }) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response: { status: () => number; url: () => string }) => { if (response.status() === 404 && /\.(css|js|png|jpe?g|svg|webp|woff2?)($|\?)/i.test(response.url())) asset404.push(response.url()); });
  page.on("request", (request: { url: () => string }) => { const url = new URL(request.url()); if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") externalRequests.push(request.url()); });
  return { consoleErrors, asset404, externalRequests };
}

test("renders approved public routes, locale document attributes, metadata, and a visible skip-link focus", async ({ page }) => {
  const observations = observe(page);
  for (const route of publicPaths) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main"), `Expected public main landmark on ${route}`).toBeVisible();
    expect(await page.locator("img").evaluateAll((images) => images.filter((image) => { const node = image as HTMLImageElement; return !node.complete || node.naturalWidth === 0; }).length)).toBe(0);
  }
  await page.goto("/ar");
  await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  expect(await page.locator(".skip-link").evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await page.locator(".language-link").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect.poll(() => page.locator("html").getAttribute("lang")).toBe("en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  expect(observations.asset404).toEqual([]);
  expect(observations.consoleErrors).toEqual([]);
  expect(observations.externalRequests).toEqual([]);
});

test("keeps portal and legal placeholders constrained and returns unknown public routes as 404", async ({ page }) => {
  await page.goto("/ar/privacy");
  await expect(page.getByText("LEGAL REVIEW REQUIRED")).toBeVisible();
  await page.goto("/ar/terms");
  await expect(page.getByText("LEGAL REVIEW REQUIRED")).toBeVisible();
  await page.goto("/ar/login");
  await expect(page.getByText(/البوابة غير مفعلة/)).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const response = await page.goto("/en/insights/not-authorized");
  expect(response?.status()).toBe(404);
});

test("supports keyboard-operable mobile navigation and local-only form validation without persistence or external requests", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const observations = observe(page);
  await page.goto("/ar");
  const menu = page.locator(".menu-trigger");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await expect(menu).toBeFocused();
  await page.goto("/ar/request-consultation");
  const storageBefore = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
  const form = page.locator("form.demo-form");
  await form.getByRole("button").click();
  await expect(form.getByRole("status")).toContainText("ثلاثة أحرف");
  await form.locator('input[name="field-0"]').fill("اختبار");
  await form.locator('input[name="field-1"]').fill("سياق");
  await form.locator('textarea[name="field-2"]').fill("أولوية تجريبية");
  await form.getByRole("button").click();
  await expect(form.getByRole("status")).toContainText("نجح التحقق محلياً");
  const storageAfter = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
  expect(storageAfter).toEqual(storageBefore);
  expect(observations.asset404).toEqual([]);
  expect(observations.consoleErrors).toEqual([]);
  expect(observations.externalRequests).toEqual([]);
});

test("passes automated accessibility checks on required public experiences", async ({ page }) => {
  for (const route of ["/ar", "/ar/services", "/ar/request-consultation", "/ar/privacy", "/ar/login"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, route).toEqual([]);
  }
});

test("remains free of horizontal overflow at the approved responsive widths", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ar/services");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Unexpected overflow at ${width}px`).toBe(true);
  }
});

test("captures final production visual evidence without broken assets", async ({ page }) => {
  const captures = [
    { name: "ar-home-desktop.png", route: "/ar", viewport: { width: 1440, height: 1000 }, text: "نحوّل التعقيد إلى" },
    { name: "en-home-desktop.png", route: "/en", viewport: { width: 1440, height: 1000 }, text: "Turn complexity" },
    { name: "ar-home-mobile.png", route: "/ar", viewport: { width: 375, height: 812 }, text: "نحوّل التعقيد إلى" },
    { name: "ar-services-desktop.png", route: "/ar/services", viewport: { width: 1440, height: 1000 }, text: "مسارات عرضية للقرار" },
    { name: "ar-request-consultation-mobile.png", route: "/ar/request-consultation", viewport: { width: 375, height: 812 }, text: "تصور لبدء حوار" },
    { name: "ar-privacy-desktop.png", route: "/ar/privacy", viewport: { width: 1440, height: 1000 }, text: "LEGAL REVIEW REQUIRED" },
    { name: "ar-login-desktop.png", route: "/ar/login", viewport: { width: 1440, height: 1000 }, text: "البوابة غير مفعلة" },
  ];
  const observations = observe(page);
  for (const capture of captures) {
    await page.setViewportSize(capture.viewport);
    const response = await page.goto(capture.route);
    expect(response?.status(), capture.route).toBe(200);
    await expect(page.getByText(capture.text).first()).toBeVisible();
    await page.screenshot({ path: `${finalScreenshots}/${capture.name}`, fullPage: true });
  }
  expect(observations.asset404).toEqual([]);
  expect(observations.consoleErrors).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ar");
  await page.locator(".menu-trigger").click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.screenshot({ path: `${finalScreenshots}/ar-mobile-menu-open.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const missing = await page.goto("/en/insights/not-authorized");
  expect(missing?.status()).toBe(404);
  await page.screenshot({ path: `${finalScreenshots}/en-not-found-desktop.png`, fullPage: true });
  expect(observations.asset404).toEqual([]);
  expect(observations.externalRequests).toEqual([]);
});
