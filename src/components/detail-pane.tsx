"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Right-hand side of a list and detail screen. On narrow screens the list
 * sits above the detail, so picking an item scrolls the detail into view.
 */
export function DetailPane({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(max-width: 980px)").matches) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pathname]);

  return (
    <div ref={ref} style={{ scrollMarginTop: 64 }}>
      {children}
    </div>
  );
}
