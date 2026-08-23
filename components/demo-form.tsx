"use client";

/** YCOS M-02 design: a clearly labeled demonstration-only form validates locally and never sends or stores input. */
import { useState } from "react";
import type { Locale } from "@/src/lib/site-data";

export function DemoForm({ locale, kind }: { locale: Locale; kind: "contact" | "consultation" }) {
  const arabic = locale === "ar";
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const fields = kind === "contact" ? (arabic ? ["الاسم التجريبي", "البريد التجريبي", "الرسالة التجريبية"] : ["Demonstration name", "Demonstration email", "Demonstration message"]) : (arabic ? ["الموضوع التجريبي", "السياق التجريبي", "الأولوية التجريبية"] : ["Demonstration topic", "Demonstration context", "Demonstration priority"]);
  const submitLabel = arabic ? "اختبار التحقق المحلي" : "Test local validation";
  const disclaimer = arabic ? "لا تُرسل هذه الواجهة أي بيانات ولا تخزنها. استخدم نصاً افتراضياً فقط." : "This interface sends and stores no data. Use placeholder text only.";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const valid = fields.every((_, index) => String(form.get(`field-${index}`) ?? "").trim().length >= 3);
    setStatus(valid ? "success" : "error");
  }
  return <form className="demo-form" noValidate onSubmit={submit} aria-describedby="demo-form-notice"><p id="demo-form-notice" className="form-disclaimer">{disclaimer}</p>{fields.map((field, index) => <label key={field}>{field}{index === 2 ? <textarea name={`field-${index}`} placeholder={arabic ? "نص افتراضي فقط" : "Placeholder text only"} rows={5} /> : <input name={`field-${index}`} dir={index === 1 && kind === "contact" ? "ltr" : undefined} placeholder={index === 1 && kind === "contact" ? "example@demo.local" : (arabic ? "مثال تجريبي" : "Demonstration example")} />}</label>)}<button className="button button--gold" type="submit">{submitLabel}</button>{status !== "idle" ? <p className={`form-status form-status--${status}`} role="status" aria-live="polite">{status === "success" ? (arabic ? "نجح التحقق محلياً. لم يُرسل أو يُخزّن أي محتوى." : "Local validation passed. No content was sent or stored.") : (arabic ? "أدخل ثلاثة أحرف على الأقل في كل حقل باستخدام بيانات تجريبية فقط." : "Enter at least three characters in each field using demonstration data only.")}</p> : null}</form>;
}
