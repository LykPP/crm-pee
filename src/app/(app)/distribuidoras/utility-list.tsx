"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function UtilityList({ items }: { items: { id: string; name: string; subtitle: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="cards" aria-label="Distribuidoras">
      {items.map((u) => (
        <Link
          key={u.id}
          href={`/distribuidoras/${u.id}`}
          className="card"
          aria-current={pathname === `/distribuidoras/${u.id}` ? "page" : undefined}
        >
          <span className="t">{u.name}</span>
          <span className="s">{u.subtitle}</span>
        </Link>
      ))}
    </nav>
  );
}
