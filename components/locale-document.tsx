"use client";

import { useEffect } from "react";
import type { Locale } from "@/src/lib/site-data";

/** Keeps the root document language and direction aligned with the active explicit public locale. */
export function LocaleDocument({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
