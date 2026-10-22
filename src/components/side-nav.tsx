"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { NAV_ITEMS } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On narrow screens the menu scrolls sideways; keep the current item visible.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav ref={navRef} className="nav" aria-label="Principal">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent(item.href) ? "page" : undefined}
        >
          <b>{item.label}</b>
          <small>{item.hint}</small>
        </Link>
      ))}
    </nav>
  );
}
