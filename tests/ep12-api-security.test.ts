import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ep12AuditSnapshot, handleEp12, resetEp12State } from "@/src/ep12/api-security";

const priorHarness = process.env.YCOS_E2E_HARNESS_ENABLED;
const priorNodeEnv = process.env.NODE_ENV;
const env = process.env as Record<string, string | undefined>;
const endpoint = (operation: string, init: RequestInit = {}, scenario?: string) => { const query = (init.method === "GET" || init.method === "DELETE") && typeof init.body === "string" ? init.body : ""; const body = init.method === "GET" || init.method === "DELETE" ? undefined : init.body; return new Request(`http://localhost/api/ep12/${operation}${query}`, { ...init, body, headers: { ...(init.headers ?? {}), ...(scenario ? { "x-ycos-e2e-scenario": scenario } : {}) } }); };
const json = (operation: string, body: Record<string, unknown>, scenario: string, headers: Record<string, string> = {}) => endpoint(operation, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }, scenario);
const get = (operation: string, query: string, scenario?: string, headers: Record<string, string> = {}) => endpoint(operation, { method: "GET", body: query, headers }, scenario);
const del = (operation: string, query: string, scenario: string) => endpoint(operation, { method: "DELETE", body: query }, scenario);
const payload = async (response: Response) => response.status === 204 ? null : response.json() as Promise<Record<string, unknown>>;

beforeEach(() => { env.NODE_ENV = "test"; env.YCOS_E2E_HARNESS_ENABLED = "true"; resetEp12State(); });
afterEach(() => { env.YCOS_E2E_HARNESS_ENABLED = priorHarness; env.NODE_ENV = priorNodeEnv; });

test("EP12 hides the local harness when disabled or production", async () => {
  env.YCOS_E2E_HARNESS_ENABLED = "false";
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "USER_A"), "object")).status, 404);
  env.YCOS_E2E_HARNESS_ENABLED = "true"; env.NODE_ENV = "production";
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "USER_A"), "object")).status, 404);
});

test("EP12 denies unauthenticated, suspended, revoked, and forged authority contexts", async () => {
  assert.equal((await handleEp12(get("object", "?id=object-a-01"), "object")).status, 401);
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "SUSPENDED"), "object")).status, 403);
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "REVOKED"), "object")).status, 403);
  const forged = await handleEp12(get("object", "?id=object-a-01&client_id=synthetic-client-b", "USER_A", { "x-ycos-role": "SECURITY_OPERATOR", "x-ycos-client-id": "synthetic-client-b" }), "object");
  assert.equal(forged.status, 200);
  const forgedBody = await payload(forged); assert.ok(forgedBody); assert.equal((forgedBody.object as { id: string }).id, "object-a-01");
});

test("EP12 preserves canonical scope and blocks BOLA/IDOR read, update, delete, and download", async () => {
  assert.equal((await handleEp12(get("object", "?id=object-b-01", "USER_A"), "object")).status, 404);
  assert.equal((await handleEp12(json("object", { id: "object-b-01", title: "attempt" }, "USER_A"), "object")).status, 404);
  assert.equal((await handleEp12(del("object", "?id=object-b-01", "USER_A"), "object")).status, 404);
  assert.equal((await handleEp12(get("file", "?id=file-b-01", "USER_A"), "file")).status, 404);
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "USER_B"), "object")).status, 404);
});

test("EP12 denies direct BFLA attempts and ignores request-role escalation", async () => {
  assert.equal((await handleEp12(json("privileged", { action: "CONTAIN", role: "SECURITY_OPERATOR" }, "USER_A"), "privileged")).status, 400);
  assert.equal((await handleEp12(json("privileged", { action: "CONTAIN" }, "USER_A"), "privileged")).status, 403);
  assert.equal((await handleEp12(json("privileged", { action: "CONTAIN" }, "SECURITY_OPERATOR"), "privileged")).status, 202);
});

test("EP12 blocks mass assignment, SQL-shaped IDs, traversal, XSS-shaped text, malformed content, and oversized body", async () => {
  assert.equal((await handleEp12(json("object", { id: "object-a-01", title: "safe", client_id: "synthetic-client-b" }, "USER_A"), "object")).status, 400);
  assert.equal((await handleEp12(json("object", { id: "object-a-01' OR '1'='1", title: "safe" }, "USER_A"), "object")).status, 400);
  assert.equal((await handleEp12(json("file", { filename: "../object-b-01" }, "USER_A"), "file")).status, 400);
  assert.equal((await handleEp12(json("object", { id: "object-a-01", title: "<script>alert(1)</script>" }, "USER_A"), "object")).status, 400);
  assert.equal((await handleEp12(endpoint("object", { method: "POST", body: "not-json", headers: { "content-type": "text/plain", "x-ycos-e2e-scenario": "USER_A" } }, "USER_A"), "object")).status, 415);
  assert.equal((await handleEp12(endpoint("object", { method: "POST", body: JSON.stringify({ id: "object-a-01", title: "x".repeat(5000) }), headers: { "content-type": "application/json", "x-ycos-e2e-scenario": "USER_A" } }, "USER_A"), "object")).status, 413);
});

test("EP12 returns minimized output and safe error data without synthetic sensitive leakage", async () => {
  const good = await handleEp12(get("object", "?id=object-a-01", "USER_A"), "object"); const goodText = await good.text();
  assert.equal(good.status, 200); assert.equal(goodText.includes("EP12_SYNTHETIC_SENSITIVE_SENTINEL"), false); assert.equal(goodText.includes("synthetic-client-a"), false); assert.equal(goodText.includes("ownerId"), false);
  const failure = await handleEp12(json("error", {}, "USER_A"), "error"); const errorText = await failure.text();
  assert.equal(failure.status, 500); assert.equal(/stack|secret|private\/|query/i.test(errorText), false);
});

test("EP12 enforces same-origin policy, cache safety, methods, and bounded pagination", async () => {
  assert.equal((await handleEp12(get("object", "?id=object-a-01", "USER_A", { origin: "https://evil.example" }), "object")).status, 403);
  const response = await handleEp12(get("object", "?id=object-a-01", "USER_A"), "object"); assert.equal(response.headers.get("cache-control"), "no-store, max-age=0"); assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal((await handleEp12(get("objects", "?pageSize=999", "USER_A"), "objects")).status, 400);
  assert.equal((await handleEp12(endpoint("objects", { method: "PUT" }, "USER_A"), "objects")).status, 405);
});

test("EP12 binds idempotency to actor/client/action and applies local abuse limits", async () => {
  const first = await handleEp12(json("export", { objectId: "object-a-01" }, "CLIENT_ADMIN_A", { "idempotency-key": "idem-a-01" }), "export"); const one = await payload(first);
  const replay = await handleEp12(json("export", { objectId: "object-a-01" }, "CLIENT_ADMIN_A", { "idempotency-key": "idem-a-01" }), "export"); const two = await payload(replay);
  assert.equal(first.status, 202); assert.equal(replay.status, 200); assert.ok(one); assert.ok(two); assert.equal(one.operationId, two.operationId);
  assert.equal((await handleEp12(json("export", { objectId: "object-b-01" }, "CLIENT_B", { "idempotency-key": "idem-a-01" }), "export")).status, 403);
  assert.equal((await handleEp12(json("export", { objectId: "object-a-01" }, "CLIENT_ADMIN_A", { "idempotency-key": "idem-a-02" }), "export")).status, 202);
  assert.equal((await handleEp12(json("export", { objectId: "object-a-01" }, "CLIENT_ADMIN_A", { "idempotency-key": "idem-a-03" }), "export")).status, 429);
});

test("EP12 uses server-controlled file identity and rejects async confused-deputy scope forgery", async () => {
  const upload = await handleEp12(json("file", { filename: "report.txt" }, "USER_A"), "file"); const body = await payload(upload);
  assert.equal(upload.status, 201); assert.ok(body); assert.equal(String((body.file as { id: string }).id).startsWith("file-a-"), true); assert.equal(JSON.stringify(body).includes("objectKey"), false);
  assert.equal((await handleEp12(json("async", { objectId: "object-b-01" }, "CLIENT_ADMIN_A"), "async")).status, 403);
  assert.equal((await handleEp12(json("async", { objectId: "object-a-01", client_id: "synthetic-client-b" }, "CLIENT_ADMIN_A"), "async")).status, 400);
});

test("EP12 audit output remains structured and excludes control-character and sensitive sentinel leakage", async () => {
  await handleEp12(json("object", { id: "object-a-01", title: "approved" }, "USER_A"), "object");
  const evidence = ep12AuditSnapshot().join("\n"); assert.equal(evidence.includes("EP12_SYNTHETIC_SENSITIVE_SENTINEL"), false); assert.equal(/\n.*\n/.test(evidence), false); assert.doesNotThrow(() => evidence.split("\n").forEach(value => JSON.parse(value)));
});
