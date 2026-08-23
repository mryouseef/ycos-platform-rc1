/** EP-12: local synthetic API security boundary; never production authentication or provider integration. */
export type Ep12Role = "USER" | "CLIENT_ADMIN" | "PLATFORM_OPERATOR" | "SECURITY_OPERATOR";
export type Ep12Context = { actorId: string; membership: "ACTIVE" | "SUSPENDED" | "REVOKED"; clientId?: "synthetic-client-a" | "synthetic-client-b"; role: Ep12Role; correlationId: string };
type ObjectRecord = { id: string; clientId: "synthetic-client-a" | "synthetic-client-b"; title: string; state: "OPEN" | "ACTIVE"; ownerId: string; sensitiveSentinel: string };
type FileRecord = { id: string; clientId: "synthetic-client-a" | "synthetic-client-b"; objectKey: string; status: "QUARANTINED" | "APPROVED" };
type IdempotencyRecord = { actorId: string; clientId?: string; action: string; result: { operationId: string; status: "ACCEPTED" } };

const maxBody = 4096;
const maxPageSize = 25;
const sentinel = "EP12_SYNTHETIC_SENSITIVE_SENTINEL";
const objectSeed = (): ObjectRecord[] => [
  { id: "object-a-01", clientId: "synthetic-client-a", title: "Synthetic scoped object A", state: "OPEN", ownerId: "synthetic-user-a", sensitiveSentinel: sentinel },
  { id: "object-b-01", clientId: "synthetic-client-b", title: "Synthetic scoped object B", state: "OPEN", ownerId: "synthetic-user-b", sensitiveSentinel: sentinel },
];
const fileSeed = (): FileRecord[] => [
  { id: "file-a-01", clientId: "synthetic-client-a", objectKey: "private/synthetic-client-a/file-a-01", status: "APPROVED" },
  { id: "file-b-01", clientId: "synthetic-client-b", objectKey: "private/synthetic-client-b/file-b-01", status: "APPROVED" },
];
type Ep12Global = typeof globalThis & { __ep12Objects?: ObjectRecord[]; __ep12Files?: FileRecord[]; __ep12Idempotency?: Map<string, IdempotencyRecord>; __ep12Limits?: Map<string, number>; __ep12Audit?: string[] };
const runtime = globalThis as Ep12Global;
const objects = () => runtime.__ep12Objects ??= objectSeed();
const files = () => runtime.__ep12Files ??= fileSeed();
const idempotency = () => runtime.__ep12Idempotency ??= new Map();
const limits = () => runtime.__ep12Limits ??= new Map();
const audits = () => runtime.__ep12Audit ??= [];

export const resetEp12State = () => { runtime.__ep12Objects = objectSeed(); runtime.__ep12Files = fileSeed(); runtime.__ep12Idempotency = new Map(); runtime.__ep12Limits = new Map(); runtime.__ep12Audit = []; };
export const ep12AuditSnapshot = () => [...audits()];
const identities: Record<string, Omit<Ep12Context, "correlationId">> = {
  USER_A: { actorId: "synthetic-user-a", membership: "ACTIVE", clientId: "synthetic-client-a", role: "USER" },
  CLIENT_A: { actorId: "synthetic-user-a", membership: "ACTIVE", clientId: "synthetic-client-a", role: "USER" },
  CLIENT_ADMIN_A: { actorId: "synthetic-client-admin-a", membership: "ACTIVE", clientId: "synthetic-client-a", role: "CLIENT_ADMIN" },
  SECURITY_OPERATOR: { actorId: "synthetic-security-operator", membership: "ACTIVE", clientId: "synthetic-client-a", role: "SECURITY_OPERATOR" },
  PLATFORM_OPERATOR: { actorId: "synthetic-platform-operator", membership: "ACTIVE", role: "PLATFORM_OPERATOR" },
  USER_B: { actorId: "synthetic-user-b", membership: "ACTIVE", clientId: "synthetic-client-b", role: "USER" },
  CLIENT_B: { actorId: "synthetic-user-b", membership: "ACTIVE", clientId: "synthetic-client-b", role: "USER" },
  SUSPENDED: { actorId: "synthetic-suspended", membership: "SUSPENDED", clientId: "synthetic-client-a", role: "USER" },
  REVOKED: { actorId: "synthetic-revoked", membership: "REVOKED", clientId: "synthetic-client-a", role: "USER" },
};

const correlationId = () => `ep12-${crypto.randomUUID()}`;
const publicHeaders = { "Cache-Control": "no-store, max-age=0", "Vary": "Origin" };
const safeText = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, " ").replaceAll(sentinel, "[REDACTED]").slice(0, 240);
const audit = (context: Ep12Context | undefined, event: string) => { audits().push(JSON.stringify({ event: safeText(event), actor: context?.actorId ?? "anonymous", correlationId: context?.correlationId ?? correlationId() })); };
export const response = (body: Record<string, unknown> | null, status: number, context?: Ep12Context) => body === null ? new Response(null, { status, headers: publicHeaders }) : Response.json({ ...body, correlationId: context?.correlationId ?? correlationId() }, { status, headers: publicHeaders });
export const safeError = (status: number, code: string, context?: Ep12Context) => { audit(context, `EP12_${code}`); return response({ code }, status, context); };

export const harnessEnabled = () => process.env.NODE_ENV !== "production" && process.env.YCOS_E2E_HARNESS_ENABLED === "true";
export const resolveContext = (request: Request): Ep12Context | undefined => {
  if (!harnessEnabled()) return undefined;
  const chosen = request.headers.get("x-ycos-e2e-scenario") ?? "";
  const identity = identities[chosen];
  return identity ? { ...identity, correlationId: correlationId() } : undefined;
};
export const originAllowed = (request: Request) => { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; };
export const validId = (value: unknown): value is string => typeof value === "string" && /^[a-z][a-z0-9-]{2,79}$/i.test(value);
export const validTitle = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 140 && !/[<>\u0000]/.test(value);
export const validFilename = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value) && !value.includes("..") && !value.includes("%2e");
export const parseJson = async (request: Request, allowed: readonly string[]): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; code: string; status: number }> => {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > maxBody) return { ok: false, code: "REQUEST_TOO_LARGE", status: 413 };
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return { ok: false, code: "UNSUPPORTED_CONTENT_TYPE", status: 415 };
  const text = await request.text();
  if (text.length > maxBody) return { ok: false, code: "REQUEST_TOO_LARGE", status: 413 };
  try { const value: unknown = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== "object") return { ok: false, code: "INVALID_REQUEST", status: 400 }; const unknown = Object.keys(value).some(key => !allowed.includes(key)); return unknown ? { ok: false, code: "UNKNOWN_OR_PROTECTED_FIELD", status: 400 } : { ok: true, value: value as Record<string, unknown> }; } catch { return { ok: false, code: "INVALID_REQUEST", status: 400 }; }
};
const activeContext = (context: Ep12Context | undefined): context is Ep12Context => Boolean(context && context.membership === "ACTIVE");
const scopedObject = (context: Ep12Context, id: string) => objects().find(value => value.id === id && value.clientId === context.clientId);
const scopedFile = (context: Ep12Context, id: string) => files().find(value => value.id === id && value.clientId === context.clientId);
const visibleObject = (object: ObjectRecord) => ({ id: object.id, title: object.title, state: object.state });
const limit = (context: Ep12Context, action: string) => { const key = `${context.actorId}:${context.clientId ?? "platform"}:${action}`; const count = limits().get(key) ?? 0; if (count >= 2) return false; limits().set(key, count + 1); return true; };

export const handleEp12 = async (request: Request, operation: string): Promise<Response> => {
  if (!harnessEnabled()) return new Response(null, { status: 404, headers: publicHeaders });
  if (!originAllowed(request)) return safeError(403, "ORIGIN_NOT_ALLOWED");
  const context = resolveContext(request);
  if (!context) return safeError(401, "AUTHENTICATION_REQUIRED");
  if (!activeContext(context)) return safeError(403, "OPERATION_NOT_AVAILABLE", context);
  if (request.method === "POST" && operation === "reset") { if (context.role !== "SECURITY_OPERATOR") return safeError(403, "OPERATION_NOT_AVAILABLE", context); resetEp12State(); return response(null, 204, context); }
  const query = new URL(request.url).searchParams;
  if (request.method === "GET" && operation === "object") { const id = query.get("id"); if (!validId(id)) return safeError(400, "INVALID_REQUEST", context); const object = scopedObject(context, id); return object ? response({ object: visibleObject(object) }, 200, context) : safeError(404, "NOT_FOUND_OR_NOT_AVAILABLE", context); }
  if (request.method === "GET" && operation === "objects") { const requested = Number(query.get("pageSize") ?? "10"); if (!Number.isInteger(requested) || requested < 1 || requested > maxPageSize) return safeError(400, "INVALID_PAGE_SIZE", context); return response({ items: objects().filter(item => item.clientId === context.clientId).slice(0, requested).map(visibleObject) }, 200, context); }
  if (request.method === "GET" && operation === "file") { const id = query.get("id"); if (!validId(id)) return safeError(400, "INVALID_REQUEST", context); const file = scopedFile(context, id); return file ? response({ file: { id: file.id, status: file.status } }, 200, context) : safeError(404, "NOT_FOUND_OR_NOT_AVAILABLE", context); }
  if (request.method === "POST" && operation === "object") { const parsed = await parseJson(request, ["id", "title"]); if (!parsed.ok) return safeError(parsed.status, parsed.code, context); if (!validId(parsed.value.id) || !validTitle(parsed.value.title)) return safeError(400, "INVALID_REQUEST", context); const object = scopedObject(context, parsed.value.id); if (!object) return safeError(404, "NOT_FOUND_OR_NOT_AVAILABLE", context); object.title = parsed.value.title.trim(); audit(context, "EP12_OBJECT_UPDATED"); return response({ object: visibleObject(object) }, 200, context); }
  if (request.method === "DELETE" && operation === "object") { const id = query.get("id"); if (!validId(id)) return safeError(400, "INVALID_REQUEST", context); const object = scopedObject(context, id); if (!object) return safeError(404, "NOT_FOUND_OR_NOT_AVAILABLE", context); runtime.__ep12Objects = objects().filter(value => value.id !== object.id); audit(context, "EP12_OBJECT_DELETED"); return response(null, 204, context); }
  if (request.method === "POST" && operation === "file") { const parsed = await parseJson(request, ["filename"]); if (!parsed.ok) return safeError(parsed.status, parsed.code, context); if (!validFilename(parsed.value.filename)) return safeError(400, "INVALID_FILENAME", context); const id = `file-${context.clientId === "synthetic-client-a" ? "a" : "b"}-${files().length + 1}`; files().push({ id, clientId: context.clientId!, objectKey: `private/${context.clientId}/${id}`, status: "QUARANTINED" }); audit(context, "EP12_FILE_QUARANTINED"); return response({ file: { id, status: "QUARANTINED" } }, 201, context); }
  if (request.method === "POST" && operation === "export") { const parsed = await parseJson(request, ["objectId"]); if (!parsed.ok) return safeError(parsed.status, parsed.code, context); const key = request.headers.get("idempotency-key"); if (context.role !== "CLIENT_ADMIN") return safeError(403, "OPERATION_NOT_AVAILABLE", context); if (!validId(parsed.value.objectId) || !validId(key)) return safeError(400, "INVALID_REQUEST", context); if (!scopedObject(context, parsed.value.objectId)) return safeError(404, "NOT_FOUND_OR_NOT_AVAILABLE", context); const previous = idempotency().get(key); if (previous && (previous.actorId !== context.actorId || previous.clientId !== context.clientId || previous.action !== "EXPORT")) return safeError(403, "OPERATION_NOT_AVAILABLE", context); if (previous) return response(previous.result, 200, context); if (!limit(context, "EXPORT")) return safeError(429, "OPERATION_THROTTLED", context); const result = { operationId: `export-${crypto.randomUUID()}`, status: "ACCEPTED" as const }; idempotency().set(key, { actorId: context.actorId, clientId: context.clientId, action: "EXPORT", result }); audit(context, "EP12_EXPORT_ACCEPTED"); return response(result, 202, context); }
  if (request.method === "POST" && operation === "privileged") { const parsed = await parseJson(request, ["action"]); if (!parsed.ok) return safeError(parsed.status, parsed.code, context); if (parsed.value.action !== "CONTAIN" || context.role !== "SECURITY_OPERATOR") return safeError(403, "OPERATION_NOT_AVAILABLE", context); if (!limit(context, "CONTAIN")) return safeError(429, "OPERATION_THROTTLED", context); audit(context, "EP12_CONTAINMENT_SIMULATED"); return response({ status: "SIMULATED" }, 202, context); }
  if (request.method === "POST" && operation === "async") { const parsed = await parseJson(request, ["objectId"]); if (!parsed.ok) return safeError(parsed.status, parsed.code, context); if (context.role !== "CLIENT_ADMIN" || !validId(parsed.value.objectId) || !scopedObject(context, parsed.value.objectId)) return safeError(403, "OPERATION_NOT_AVAILABLE", context); audit(context, "EP12_ASYNC_ENVELOPE_ACCEPTED"); return response({ status: "SIMULATED_ENVELOPE_ACCEPTED" }, 202, context); }
  if (request.method === "POST" && operation === "error") return safeError(500, "REQUEST_FAILED", context);
  return safeError(405, "METHOD_OR_OPERATION_NOT_ALLOWED", context);
};
