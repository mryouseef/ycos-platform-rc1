"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { e2eScenario } from "@/src/portal/fixtures";
import { boundedId, boundedTitle, boundedVersion } from "@/src/security/input";
import { assignWork, createWork, transitionEngagement, transitionProject, transitionRequest, transitionWork, updateRequest, updateWork } from "./service";

export type CommandState = { status: "idle" | "success" | "deny" | "conflict" | "validation"; message: string; version?: number; resourceId?: string; nextState?: string; title?: string };
const copy = (locale: string, code: string) => ({ success: locale === "ar" ? "تم تنفيذ الأمر الاصطناعي وتحديث الإصدار." : "Synthetic command completed and version updated.", VERSION_CONFLICT: locale === "ar" ? "تعارض إصدار آمن. حدّث الصفحة ثم أعد المحاولة." : "Safe version conflict. Refresh and retry.", validation: locale === "ar" ? "تحقق من الحقول المطلوبة ثم أعد المحاولة." : "Check required fields and retry.", deny: locale === "ar" ? "لا تتوفر هذه العملية ضمن سياقك الحالي." : "This operation is not available in the current context." }[code] ?? (locale === "ar" ? "العملية غير متاحة." : "Operation unavailable."));

export async function executeM06Command(_: CommandState, form: FormData): Promise<CommandState> {
  const locale = form.get("locale") === "en" ? "en" : "ar";
  const actor = e2eScenario((await headers()).get("x-ycos-e2e-scenario") ?? undefined);
  const kind = String(form.get("kind") ?? ""); const id = String(form.get("id") ?? ""); const target = String(form.get("target") ?? ""); const version = Number(form.get("version")); const title = String(form.get("title") ?? "").trim(); const projectId = String(form.get("projectId") ?? ""); const assignee = String(form.get("assignee") ?? "");
  const allowedKinds = new Set(["request", "engagement", "project", "work", "assign", "create", "update-request", "update-work"]);
  if (!actor || !allowedKinds.has(kind) || !boundedId(id) || !boundedVersion(version)) return { status: "deny", message: copy(locale, "deny") };
  if ((kind === "create" || kind === "update-request" || kind === "update-work") && !boundedTitle(title)) return { status: "validation", message: copy(locale, "validation") };
  if ((kind === "create" && !boundedId(projectId)) || (kind === "assign" && !boundedId(assignee))) return { status: "deny", message: copy(locale, "deny") };
  const result = kind === "request" ? transitionRequest(actor, id, target as never, version) : kind === "engagement" ? transitionEngagement(actor, id, target as never, version) : kind === "project" ? transitionProject(actor, id, target as never, version) : kind === "work" ? transitionWork(actor, id, target as never, version) : kind === "assign" ? assignWork(actor, id, assignee, version) : kind === "create" ? createWork(actor, projectId, id, title, version) : kind === "update-request" ? updateRequest(actor, id, title, version) : kind === "update-work" ? updateWork(actor, id, title, version) : undefined;
  if (!result) return { status: "deny", message: copy(locale, "deny") };
  revalidatePath(`/${locale}/portal`, "layout");
  if (!result.ok) return { status: result.error === "VERSION_CONFLICT" ? "conflict" : "deny", message: copy(locale, result.error) };
  const value = result.value as { id: string; version: number; state?: string; title?: string };
  return { status: "success", message: copy(locale, "success"), version: value.version, resourceId: value.id, nextState: value.state, title: value.title };
}
