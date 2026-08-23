import type { Metadata } from "next";
import { M06Page } from "@/src/m06/m06-page";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Records({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; return <M06Page locale={locale} resource="PROFILE" mode="records"/>; }
