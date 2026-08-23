"use client";

/** YCOS M-02 design: a restrained mobile drawer keeps the deep-navy architectural system usable on narrow screens. */
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/src/lib/site-data";

type Item = { href: string; label: string };

export function MobileNav({ locale, items, menuLabel, menuText, closeText }: { locale: Locale; items: Item[]; menuLabel: string; menuText: string; closeText: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeWithEscape);
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);

  return (
    <div className="mobile-nav">
      <button ref={triggerRef} className="menu-trigger" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? closeText : menuText} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true" className="menu-trigger__lines"><i /><i /></span>
        <span>{open ? closeText : menuText}</span>
      </button>
      {open ? (
        <nav ref={menuRef} id="mobile-navigation" className="mobile-menu" aria-label={menuLabel} lang={locale}>
          {items.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↙</span></a>)}
        </nav>
      ) : null}
    </div>
  );
}
