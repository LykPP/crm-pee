/** Turns audit log rows into sentences people can read. */

export interface AuditRow {
  id: number;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const TABLES: Record<string, string> = {
  utilities: "distribuidora",
  calls: "edital",
  clients: "cliente",
  contacts: "contato",
  projects: "projeto",
  consumer_units: "UC",
  project_documents: "documento",
  efficiency_actions: "ação de eficiência",
  project_costs: "custos",
  execution_steps: "etapa da obra",
  interactions: "registro de contato",
};

const FIELDS: Record<string, string> = {
  name: "nome",
  stage: "etapa",
  status: "situação",
  next_action: "próxima ação",
  next_action_on: "data da próxima ação",
  valid_until: "validade",
  issued_on: "emissão",
  file_path: "arquivo",
  notes: "observações",
  typology: "tipologia",
  modality: "modalidade",
  call_id: "edital",
  folder_url: "pasta",
  responsible: "responsável",
  quantity: "quantidade",
  unit_cost: "custo unitário",
  power_before_w: "potência antes",
  power_after_w: "potência depois",
  hours_per_year: "horas por ano",
  number: "número",
  email: "e-mail",
  phone: "telefone",
  submission_deadline: "prazo",
  rules: "regras",
  diagnosis: "diagnóstico",
  other_services: "outros serviços",
  started_on: "início",
  finished_on: "fim",
};

const IGNORED = new Set(["updated_at", "created_at", "id", "org_id"]);
const VERB = { insert: "criou", update: "alterou", delete: "excluiu" } as const;

function label(row: AuditRow) {
  const d = row.new_data ?? row.old_data ?? {};
  const name = d.name ?? d.summary ?? d.end_use ?? d.item_key ?? d.step_key ?? d.number ?? d.code;
  return typeof name === "string" ? name : null;
}

/** Fields whose values differ between the old and new row. */
export function changedFields(row: AuditRow) {
  if (row.action !== "update" || !row.old_data || !row.new_data) return [];
  return Object.keys(row.new_data)
    .filter((k) => !IGNORED.has(k) && JSON.stringify(row.old_data![k]) !== JSON.stringify(row.new_data![k]))
    .map((k) => FIELDS[k] ?? k.replace(/_/g, " "));
}

export function describeChange(row: AuditRow) {
  const what = TABLES[row.table_name] ?? row.table_name;
  const name = label(row);
  const fields = changedFields(row);
  return `${VERB[row.action]} ${what}${name ? ` "${name}"` : ""}${fields.length ? ` (${fields.join(", ")})` : ""}`;
}
