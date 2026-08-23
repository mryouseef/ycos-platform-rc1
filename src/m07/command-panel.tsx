"use client";

import { useActionState, useEffect, useRef } from "react";
import { executeM07Command, type M07State } from "./actions";

type Row = { id: string; state: string; version: number; title?: string };
const edges: Record<string, string[]> = { DRAFT: ["PROPOSED", "WITHDRAWN", "IN_REVIEW"], PROPOSED: ["UNDER_REVIEW", "WITHDRAWN"], UNDER_REVIEW: ["APPROVED", "REJECTED"], REQUESTED: ["PENDING", "WITHDRAWN"], PENDING: ["APPROVED", "REJECTED", "EXPIRED"], IN_REVIEW: ["APPROVED"], APPROVED: ["DELIVERED"], DELIVERED: ["ARCHIVED"] };
const allowed = (kind: string, role: string, target: string) => kind === "decision" ? (["APPROVED", "REJECTED"].includes(target) ? role === "ROLE-03" : role === "ROLE-05") : kind === "approval" ? (["APPROVED", "REJECTED"].includes(target) ? role === "ROLE-03" : target === "EXPIRED" ? role === "ROLE-06" : role === "ROLE-05") : target === "IN_REVIEW" ? role === "ROLE-04" : target === "APPROVED" ? role === "ROLE-03" : target === "DELIVERED" ? role === "ROLE-05" : target === "ARCHIVED" ? role === "ROLE-07" : false;
const label = (ar: boolean, target: string) => ({ PROPOSED: ar ? "اقتراح" : "Propose", UNDER_REVIEW: ar ? "إرسال للمراجعة" : "Send to review", APPROVED: ar ? "اعتماد" : "Approve", REJECTED: ar ? "رفض" : "Reject", WITHDRAWN: ar ? "سحب" : "Withdraw", PENDING: ar ? "طلب موافقة" : "Request approval", EXPIRED: ar ? "إنهاء" : "Expire", IN_REVIEW: ar ? "إرسال للمراجعة" : "Submit for review", DELIVERED: ar ? "تسليم" : "Deliver", ARCHIVED: ar ? "أرشفة" : "Archive" }[target] ?? target);

export function M07CommandPanel({ locale, kind, role, rows }: { locale: "ar" | "en"; kind: "decision" | "approval" | "deliverable"; role: string; rows: Row[] }) {
  const [state, action, pending] = useActionState(executeM07Command, { status: "idle", message: "" } as M07State);
  const result = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.status !== "idle") result.current?.focus(); }, [state]);
  const ar = locale === "ar";
  return <section className="command-panel" aria-label={ar ? "أوامر المرحلة السابعة" : "M-07 commands"}>
    {state.status !== "idle" && <p ref={result} tabIndex={-1} className={`command-status command-status--${state.status}`} aria-live="polite">{state.message}{state.version ? ` v${state.version}` : ""}</p>}
    {rows.map(source => {
      const row = state.status === "success" && state.resourceId === source.id ? { ...source, state: state.nextState ?? source.state, version: state.version ?? source.version } : source;
      return <div key={row.id} data-m07-row={row.id} className="command-row"><span className="command-version">{row.state} · v{row.version}</span>{(edges[row.state] ?? []).filter(target => allowed(kind, role, target)).map(target => <form action={action} key={target}><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={row.id}/><input type="hidden" name="target" value={target}/><input type="hidden" name="version" value={row.version}/><button disabled={pending} data-m07-command={`${kind}-${target.toLowerCase()}`} onClick={event => { if (["APPROVED", "REJECTED", "WITHDRAWN", "ARCHIVED"].includes(target) && !confirm(ar ? "تأكيد العملية الحاسمة؟" : "Confirm consequential operation?")) event.preventDefault(); }}>{label(ar, target)}</button></form>)}</div>;
    })}
  </section>;
}
