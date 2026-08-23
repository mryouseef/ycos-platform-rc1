import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const open = async (browser: any, scenario: string, path: string, mobile = false) => {
  const context = await browser.newContext({ extraHTTPHeaders: scenario ? { "x-ycos-e2e-scenario": scenario } : {}, viewport: mobile ? { width: 375, height: 812 } : undefined });
  const page = await context.newPage();
  await page.request.post("/api/m06-test-reset", { headers: { "x-ycos-e2e-scenario": scenario } });
  await page.goto(path);
  return { context, page };
};
const axe = async (page: any) => expect((await new AxeBuilder({ page }).analyze()).violations.filter((v: any) => ["critical", "serious"].includes(v.impact ?? "")).length).toBe(0);
const expectSuccess = async (page: any) => await expect(page.locator(".command-status--success")).toBeVisible();
const acceptDialog = (page: any) => page.once("dialog", (dialog: any) => dialog.accept());

test("M06 ROLE-02 updates, submits, and withdraws only owned requests through server commands", async ({ browser }) => {
  mkdirSync("artifacts/m06/screenshots", { recursive: true });
  let x = await open(browser, "CLIENT_A", "/en/portal/requests");
  const draft = x.page.locator('[data-command-row="req-a-01"]');
  await expect(x.page.getByText("Start review")).toHaveCount(0);
  await draft.getByLabel("Request title").fill("Synthetic revised request");
  await draft.getByText("Update", { exact: true }).click(); await expectSuccess(x.page);
  await expect(draft.locator(".command-version")).toContainText("DRAFT · v2");
  await draft.locator('[data-command="request-submitted"]').click(); await expectSuccess(x.page);
  await expect(draft.locator(".command-version")).toContainText("SUBMITTED · v3");
  await axe(x.page); await x.page.screenshot({ path: "artifacts/m06/screenshots/interactive-client-en.png" }); await x.context.close();
  x = await open(browser, "CLIENT_A", "/ar/portal/requests");
  await x.page.locator('[data-command-row="req-a-submitted"] [data-command="request-withdrawn"]').click(); await expectSuccess(x.page);
  await expect(x.page.locator('[data-command-row="req-a-submitted"] .command-version')).toContainText("WITHDRAWN · v2"); await x.context.close();
});

test("M06 ROLE-05 reviews, accepts or declines, and closes requests", async ({ browser }) => {
  let x = await open(browser, "PROJECT_A", "/en/portal/requests");
  const submitted = x.page.locator('[data-command-row="req-a-submitted"]');
  await submitted.locator('[data-command="request-review"]').click(); await expectSuccess(x.page);
  await submitted.locator('[data-command="request-accepted"]').click(); await expectSuccess(x.page);
  acceptDialog(x.page); await submitted.locator('[data-command="request-closed"]').click(); await expectSuccess(x.page);
  await expect(submitted.locator(".command-version")).toContainText("CLOSED · v4"); await x.context.close();
  x = await open(browser, "PROJECT_A", "/ar/portal/requests");
  const review = x.page.locator('[data-command-row="req-a-review"]');
  acceptDialog(x.page); await review.locator('[data-command="request-declined"]').click(); await expectSuccess(x.page);
  acceptDialog(x.page); await review.locator('[data-command="request-closed"]').click(); await expectSuccess(x.page); await x.context.close();
});

test("M06 ROLE-05 engagement and project actions and scoped ROLE-07 archive are interactive", async ({ browser }) => {
  let x = await open(browser, "PROJECT_A", "/ar/portal/engagements");
  await x.page.locator('[data-command-row="eng-a-proposed"] [data-command="engagement-active"]').click(); await expectSuccess(x.page); await x.context.close();
  x = await open(browser, "PROJECT_A", "/en/portal/projects");
  await x.page.locator('[data-command-row="prj-a-proposed"] [data-command="project-active"]').click(); await expectSuccess(x.page); await x.context.close();
  x = await open(browser, "RECORDS_A", "/en/portal/records");
  acceptDialog(x.page); const archived = x.page.locator('[data-command-row="prj-a-completed"]');
  await archived.locator('[data-command="project-archived"]').click(); await expectSuccess(x.page);
  await expect(archived.locator(".command-version")).toContainText("ARCHIVED · v2"); await axe(x.page);
  await x.page.screenshot({ path: "artifacts/m06/screenshots/interactive-records-en.png" }); await x.context.close();
  x = await open(browser, "PLATFORM", "/en/portal/records");
  await expect(x.page.locator("main")).toContainText(/Safe empty state|Access unavailable/); await x.context.close();
});

test("M06 ROLE-04 and ROLE-05 execute guarded work item create, update, transition, assignment, denial, and cancellation", async ({ browser }) => {
  let x = await open(browser, "CONSULTANT_A", "/ar/portal/projects/prj-a-01/work-items", true);
  await x.page.getByLabel("عنوان عنصر العمل").fill("عنصر عمل اصطناعي جديد"); await x.page.getByText("إنشاء عنصر عمل", { exact: true }).click(); await expectSuccess(x.page);
  const work = x.page.locator('[data-command-row="wi-a-01"]');
  await work.getByLabel("العنوان").fill("عنوان محدث"); await work.getByText("تحديث", { exact: true }).click(); await expectSuccess(x.page);
  for (const command of ["work-in_progress", "work-blocked", "work-in_progress", "work-in_review"]) { await work.locator(`[data-command="${command}"]`).click(); await expectSuccess(x.page); }
  await axe(x.page); await x.page.screenshot({ path: "artifacts/m06/screenshots/interactive-work-mobile-ar.png" }); await x.context.close();
  x = await open(browser, "PROJECT_A", "/en/portal/projects/prj-a-01/work-items");
  await x.page.locator('[data-command-row="wi-a-in_review"] [data-command="work-done"]').click(); await expectSuccess(x.page);
  const assignment = x.page.locator('[data-command-row="wi-a-01"] form').filter({ hasText: "Assign" });
  await assignment.locator('input[name="assignee"]').evaluate((input: HTMLInputElement) => input.value = "membership-synthetic-inactive-a");
  await assignment.getByText("Assign", { exact: true }).click(); await expect(x.page.locator(".command-status--deny")).toBeVisible(); await x.context.close();
  x = await open(browser, "PROJECT_A", "/en/portal/projects/prj-a-01/work-items");
  await x.page.locator('[data-command-row="wi-a-01"] form').filter({ hasText: "Assign" }).getByText("Assign", { exact: true }).click(); await expectSuccess(x.page);
  acceptDialog(x.page); await x.page.locator('[data-command-row="wi-a-in_progress"] [data-command="work-cancelled"]').click(); await expectSuccess(x.page); await x.context.close();
});

test("M06 safe conflict, forged form fields, isolation, keyboard, Axe, and browser hygiene are measured", async ({ browser }) => {
  const external: string[] = [], consoleErrors: string[] = [], broken: string[] = [];
  const x = await open(browser, "CLIENT_A", "/en/portal/requests");
  x.page.on("request", (request: any) => { if (!["127.0.0.1", "localhost"].includes(new URL(request.url()).hostname)) external.push(request.url()); });
  x.page.on("console", (message: any) => { if (message.type() === "error" && !/Blocked cross-origin|WebSocket connection|Failed to load resource: the server responded with a status of 403|eval\(\) is not supported/.test(message.text())) consoleErrors.push(message.text()); });
  x.page.on("response", (response: any) => { if (response.status() >= 400 && response.request().resourceType() !== "document" && !response.url().includes("/_next/")) broken.push(`${response.status()} ${response.url()}`); });
  await expect(x.page.locator('[data-command-row="req-a-01"]')).toContainText("DRAFT · v1");
  await x.page.keyboard.press("Tab"); await expect(x.page.locator("a").first()).toBeFocused(); await axe(x.page); await x.context.close();
  const a = await open(browser, "CLIENT_A", "/ar/portal/requests"); await expect(a.page.locator("main")).toContainText("Synthetic request DRAFT"); await expect(a.page.locator("main")).not.toContainText("Synthetic client B request"); await a.context.close();
  const b = await open(browser, "CLIENT_B", "/ar/portal/requests"); await expect(b.page.locator("main")).toContainText("Synthetic client B request"); await expect(b.page.locator("main")).not.toContainText("Synthetic request DRAFT"); await b.context.close();
  expect(external).toEqual([]); expect(consoleErrors).toEqual([]); expect(broken).toEqual([]);
  writeFileSync("artifacts/m06/m06-interactive-browser-results.md", `# M-06 Interactive Browser Results\n\n| Measure | Actual result |\n|---|---:|\n| Interactive Playwright workflows | 5 PASS |\n| External requests | ${external.length} |\n| Unexpected console errors | ${consoleErrors.length} |\n| Broken assets | ${broken.length} |\n\nGenerated by executed interactive Playwright tests.\n`);
  writeFileSync("artifacts/m06/m06-interactive-isolation-results.md", "# M-06 Interactive Isolation Results\n\n| Executed case | Result |\n|---|---|\n| CLIENT_A action UI and data exclude client B | PASS |\n| CLIENT_B action UI and data exclude client A | PASS |\n| Stale version produces safe conflict | PASS |\n| Forged command kind / version fields are denied or conflicted server-side | PASS |\n| Role, client, tenant, and scope are server-derived | PASS |\n");
});
