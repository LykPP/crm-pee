"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CLIENT_STATUS, type ClientStatus } from "@/lib/data/clients";

const FILTERS: [ClientStatus | "all", string][] = [
  ["all", "Todos"],
  ["lead", "Leads"],
  ["qualified", "Qualificados"],
  ["active", "Com projeto"],
];

export interface ClientListItem {
  id: string;
  name: string;
  municipality: string | null;
  status: ClientStatus;
  searchText: string;
}

export function ClientList({ clients }: { clients: ClientListItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const q = query.trim().toLowerCase();
  const shown = clients.filter(
    (c) => (filter === "all" || c.status === filter) && (!q || c.searchText.includes(q)),
  );

  return (
    <div className="cards">
      <input
        className="search"
        placeholder="Buscar cliente ou município"
        aria-label="Buscar cliente ou município"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <div className="seg" style={{ marginBottom: 8 }} role="group" aria-label="Filtrar por status">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {shown.length ? (
        shown.map((c) => (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="card"
            aria-current={pathname === `/clientes/${c.id}` ? "page" : undefined}
          >
            <span className="t">{c.name}</span>
            <span className="s">
              {c.municipality ?? ""} · {CLIENT_STATUS[c.status]}
            </span>
          </Link>
        ))
      ) : (
        <div className="empty">
          <b>Nenhum cliente encontrado</b>
          <span>Ajuste a busca ou cadastre um cliente.</span>
        </div>
      )}
    </div>
  );
}
