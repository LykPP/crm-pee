/** Choices offered by the project form. */
import type { CallOption, ClientOption } from "@/app/(app)/projetos/project-form";
import type { ClientRow } from "./clients";
import { DEFAULT_TYPOLOGIES } from "./clients";
import { shortCallCode, type CallRow } from "./reference";

export function projectFormOptions(clients: ClientRow[], calls: CallRow[]) {
  const clientOptions: ClientOption[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    typology: c.typology,
    modality: c.modality,
    municipality: c.municipality,
  }));
  const callOptions: CallOption[] = calls.map((c) => ({
    id: c.id,
    code: c.code,
    label: `${c.utility?.short_name ?? ""} ${shortCallCode(c)}${c.org_id ? " (cópia)" : ""}`.trim(),
    typologies: c.rules.typologies?.map((t) => t.name) ?? [],
    levels: c.rules.avoidedCosts?.map((a) => [a.level, a.description ?? a.level] as [string, string]) ?? [],
  }));
  const openCall = calls.find((c) => c.status === "open") ?? calls[0];
  return {
    clients: clientOptions,
    calls: callOptions,
    defaultCallId: openCall?.id,
    fallbackTypologies: DEFAULT_TYPOLOGIES,
  };
}
