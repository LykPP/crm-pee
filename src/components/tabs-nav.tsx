"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Tab bar driven by the URL. On narrow screens the tab content sits below
 * the summary, so switching tabs scrolls the bar into view.
 */
export function TabsNav({
  tabs,
  current,
  label,
}: {
  tabs: { href: string; label: string; key: string }[];
  current: string;
  label: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const params = useSearchParams();
  const first = useRef(true);
  const tab = params.get("aba");

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 980px)").matches) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tab]);

  return (
    <nav ref={ref} className="tabs" aria-label={label} style={{ scrollMarginTop: 64 }}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={current === t.key ? "page" : undefined} scroll={false}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
