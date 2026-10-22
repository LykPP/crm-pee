/** Portuguese labels for values stored in English in the database. */

export const CALL_STATUS = {
  upcoming: { label: "Previsto", tone: "acc" },
  open: { label: "Aberto", tone: "ok" },
  to_verify: { label: "A verificar", tone: "warn" },
  closed: { label: "Encerrado", tone: "" },
} as const;

export type CallStatus = keyof typeof CALL_STATUS;

export const INTERACTION_KINDS = {
  call: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  visit: "Visita",
  meeting: "Reunião",
  other: "Outro",
} as const;

export type InteractionKind = keyof typeof INTERACTION_KINDS;

export const APPLIES_TO_LABELS: Record<string, string> = {
  all: "Sempre",
  fp: "Só fundo perdido",
  cd: "Só contrato de desempenho",
  cd_micro_small_business: "Contrato de desempenho com ME/EPP",
  non_removable_uses: "Fundo perdido com usos não removíveis",
  heritage_listed: "Imóvel tombado",
  incentivized_source: "Com geração solar",
};

export const VALIDITY_LABELS: Record<string, string> = {
  certificate: "válida no dia do envio",
  bill_3_months: "até 3 meses antes do envio",
  quote_3_months: "até 3 meses antes da publicação",
  property_30_days: "até 30 dias",
};

export const LIMIT_LABELS: [string, string][] = [
  ["thirdPartyLabor", "Mão de obra de terceiros"],
  ["diagnosis", "Diagnóstico energético"],
  ["executiveDesign", "Projeto executivo"],
  ["management", "Gerenciamento"],
  ["finalReport", "Relatório final"],
  ["measurementVerification", "Medição e verificação"],
  ["marketing", "Marketing"],
  ["training", "Treinamento"],
];

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Link to a web search for calls of a utility in the current year. */
export function searchCallsUrl(utilityName: string, year = new Date().getFullYear()) {
  const q = `"chamada pública de projetos" eficiência energética ${utilityName} ${year}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function whatsappUrl(phone: string, text = "") {
  const digits = phone.replace(/\D/g, "").replace(/^55/, "");
  return `https://wa.me/55${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
