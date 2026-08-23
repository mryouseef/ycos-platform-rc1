import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authorize } from "@/src/portal/policy";
import { actors } from "@/src/portal/fixtures";
import { m06repo, resetM06Repository } from "@/src/m06/repository";
import { ep12AuditSnapshot, handleEp12, resetEp12State } from "@/src/ep12/api-security";

const api = (path: string, init: RequestInit = {}, scenario?: string) => new Request(`http://localhost${path}`, { ...init, headers: { ...(init.headers ?? {}), ...(scenario ? { "x-ycos-e2e-scenario": scenario } : {}) } });
const post = (path: string, body: Record<string, unknown>, scenario: string, headers: Record<string, string> = {}) => api(path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }, scenario);
beforeEach(() => { process.env.YCOS_E2E_HARNESS_ENABLED = "true"; resetM06Repository(); resetEp12State(); });

test("EP12 preserves selected EP03-EP11 security invariants", async () => {
  assert.equal(authorize(undefined, "REQUESTS").effect, "DENY");
  assert.equal(authorize(actors.CLIENT_A, "ADMIN").effect, "DENY");
  assert.equal(m06repo.requestFor(actors.CLIENT_A, "req-b-01"), undefined);
  assert.equal(m06repo.projectFor(actors.CLIENT_A, "prj-b-01"), undefined);
  assert.equal((await handleEp12(api("/api/ep12/file?id=file-b-01"), "file")).status, 401);
  assert.equal((await handleEp12(api("/api/ep12/file?id=file-b-01", {}, "USER_A"), "file")).status, 404);
  assert.equal((await handleEp12(post("/api/ep12/export", { objectId: "object-b-01" }, "CLIENT_ADMIN_A", { "idempotency-key": "regress-a-01" }), "export")).status, 404);
  assert.equal((await handleEp12(post("/api/ep12/privileged", { action: "CONTAIN" }, "USER_A"), "privileged")).status, 403);
  assert.equal((await handleEp12(api("/api/ep12/restore", { method: "POST" }, "USER_A"), "restore")).status, 405);
  assert.equal((await handleEp12(api("/api/ep12/release", { method: "POST" }, "USER_A"), "release")).status, 405);
  await handleEp12(post("/api/ep12/object", { id: "object-a-01", title: "bounded" }, "USER_A"), "object");
  assert.equal(ep12AuditSnapshot().join("\n").includes("EP12_SYNTHETIC_SENSITIVE_SENTINEL"), false);
});
