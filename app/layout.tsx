/** YCOS M-02 design: a restrained deep-navy public canvas with gold precision accents. */
import type { Metadata } from "next";
import "./globals.css";
import "./m06-fonts.css";
import "./m07-states.css";
import "./m08-states.css";
export const metadata: Metadata = { title: "YCOS | Public platform concept", description: "A bilingual consulting-technology platform concept in development.", metadataBase: new URL("https://ycos.example") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ar" dir="rtl" suppressHydrationWarning><body>{children}</body></html>; }
