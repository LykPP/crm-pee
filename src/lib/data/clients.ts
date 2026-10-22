/** Clients of the organization. */
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ClientStatus = "lead" | "qualified" | "active" | "inactive";

export const CLIENT_STATUS: Record<ClientStatus, string> = {
  lead: "Lead",
  qualified: "Qualificado",
  active: "Com projeto",
  inactive: "Inativo",
};

/** Typologies used when no call lists its own. */
export const DEFAULT_TYPOLOGIES = [
  "Industrial",
  "Residencial (Condomínios)",
  "Comércio e Serviços",
  "Poder Público",
  "Serviços Públicos",
  "Rural",
  "Iluminação Pública",
];

export interface ClientRow {
  id: string;
  name: string;
  kind: string | null;
  cnpj: string | null;
  municipality: string | null;
  state: string | null;
  utility_id: string | null;
  typology: string | null;
  modality: "fp" | "cd" | null;
  status: ClientStatus;
  next_action_on: string | null;
  next_action: string | null;
  notes: string | null;
  is_example: boolean;
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return res.data as T;
}

export async function listClients(supabase: Supabase) {
  const rows = must(await supabase.from("clients").select("*"), "clients") as ClientRow[];
  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getClient(supabase: Supabase, id: string) {
  return must(await supabase.from("clients").select("*").eq("id", id).maybeSingle(), "client") as ClientRow | null;
}
