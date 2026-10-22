"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALL_STATUS } from "@/lib/labels";

export interface CallListItem {
  id: string;
  title: string;
  status: keyof typeof CALL_STATUS;
  subtitle: string;
}

export function CallList({ calls }: { calls: CallListItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="cards" aria-label="Editais">
      {calls.map((c) => {
        const st = CALL_STATUS[c.status];
        return (
          <Link
            key={c.id}
            href={`/editais/${c.id}`}
            className="card"
            aria-current={pathname === `/editais/${c.id}` ? "page" : undefined}
          >
            <span className="row" style={{ justifyContent: "space-between" }}>
              <span className="t">{c.title}</span>
              <span className={`chip ${st.tone}`}>{st.label}</span>
            </span>
            <span className="s">{c.subtitle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
