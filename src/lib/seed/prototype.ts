/**
 * Conversion from the prototype's data format (Portuguese keys, one
 * document per record) to the database rows used by the app.
 */
import { callRulesSchema, type CallRules } from "@/lib/calls/rules-schema";

type Num = number | string | null | undefined;

export interface ProtoUtility {
  nome: string;
  sigla: string;
  uf?: string;
  area?: string;
  site?: string;
  emailPEE?: string;
  linkSubmissao?: string;
  endereco?: string;
}

export interface ProtoCall {
  codigo: string;
  nome: string;
  distribuidoraId: string;
  status: string;
  publicacao?: string;
  prazoSubmissao?: string;
  prazoNota?: string;
  recursoTotal?: number;
  linkEdital?: string;
  linkSubmissao?: string;
  emailEsclarecimento?: string;
  assuntoEsclarecimento?: string;
  notas?: string;
  tipologias?: { nome: string; recurso: number; min: number; max: number; modalidade?: string }[];
  rcbMax?: { fp: number; cd: number; fi?: number };
  taxaDesconto?: number;
  horarioPonta?: string;
  prazoExecucao?: string;
  retornoCD?: string;
  limites?: Record<string, number | { pct: number; teto?: number }>;
  mop?: { fixo: number; pct: number };
  custosEvitados?: { nivel: string; desc?: string; cee: number; ced: number }[];
  checklist?: {
    id: string;
    grupo: string;
    nome: string;
    ref?: string;
    aplica: string;
    escopo: string;
    dica?: string;
    validade?: string;
    opcional?: boolean;
  }[];
  regras?: { t: string; ref?: string }[];
  pontuacao?: { item: string; criterio: string; pontos: number }[];
  fotosMinimas?: { etapa: string; qtd: number }[];
}

export interface ProtoContact {
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  principal?: boolean;
}

export interface ProtoClient {
  nome: string;
  tipo?: string;
  cnpj?: string;
  municipio?: string;
  uf?: string;
  distribuidoraId?: string;
  tipologia?: string;
  modalidade?: string;
  status?: string;
  contatos?: ProtoContact[];
  proximaAcao?: { data?: string; texto?: string };
  notas?: string;
  exemplo?: boolean;
}

export interface ProtoAction {
  uso: string;
  desc?: string;
  qtd?: Num;
  pa?: Num;
  pd?: Num;
  horas?: Num;
  nup?: Num;
  nd?: Num;
  nm?: Num;
  vida?: Num;
  custo?: Num;
  eeManual?: Num;
  rdpManual?: Num;
}

export interface ProtoDocument {
  status?: string;
  arquivo?: string;
  emissao?: string;
  validade?: string;
  obs?: string;
}

export interface ProtoProject {
  nome: string;
  clienteId: string;
  editalId?: string;
  tipologia?: string;
  modalidade?: string;
  nivelTensao?: string;
  municipio?: string;
  responsavel?: string;
  etapa?: string;
  flags?: Partial<Record<"meEpp" | "naoRemovivel" | "tombado" | "fonteIncentivada" | "licitacao", boolean>>;
  ucs?: { id: string; numero: string; descricao?: string }[];
  acoes?: ProtoAction[];
  custos?: Partial<Record<string, Num>>;
  docs?: Record<string, ProtoDocument>;
  execucao?: Record<string, { status?: string; inicio?: string; fim?: string }>;
  pastaOneDrive?: string;
  proximaAcao?: { data?: string; texto?: string };
  exemplo?: boolean;
}

export interface ProtoInteraction {
  clienteId?: string;
  projetoId?: string;
  distribuidoraId?: string;
  tipo: string;
  data: string;
  resumo: string;
  por?: string;
  exemplo?: boolean;
}

// ---------------------------------------------------------------------------
// Value mappings
// ---------------------------------------------------------------------------

export const STAGE_FROM_PROTO: Record<string, string> = {
  prospeccao: "prospecting",
  visita: "site_visit",
  documentacao: "documentation",
  diagnostico: "diagnosis",
  pronto: "ready",
  submetido: "submitted",
  aprovado: "approved",
  execucao: "execution",
  mv: "mv",
  concluido: "completed",
  perdido: "lost",
};

const CALL_STATUS: Record<string, string> = { aberto: "open", verificar: "to_verify", encerrado: "closed" };
const CLIENT_STATUS: Record<string, string> = {
  lead: "lead",
  qualificado: "qualified",
  ativo: "active",
  inativo: "inactive",
};
const INTERACTION_KIND: Record<string, string> = {
  Ligação: "call",
  "E-mail": "email",
  WhatsApp: "whatsapp",
  Visita: "visit",
  Reunião: "meeting",
  Outro: "other",
};
const DOCUMENT_STATUS: Record<string, string> = { ok: "ok", na: "na" };
const STEP_STATUS: Record<string, string> = { a_fazer: "todo", andamento: "in_progress", concluida: "done" };
const APPLIES_TO: Record<string, string> = {
  todos: "all",
  fp: "fp",
  cd: "cd",
  cd_me: "cd_micro_small_business",
  naoRemovivel: "non_removable_uses",
  tombado: "heritage_listed",
  fonteIncentivada: "incentivized_source",
};
const VALIDITY: Record<string, string> = {
  certidao: "certificate",
  fatura3m: "bill_3_months",
  orcamento3m: "quote_3_months",
  imovel30d: "property_30_days",
};
const LIMIT_KEYS: Record<string, string> = {
  mot: "thirdPartyLabor",
  diag: "diagnosis",
  projExec: "executiveDesign",
  gerenc: "management",
  relFinal: "finalReport",
  mv: "measurementVerification",
  mkt: "marketing",
  trein: "training",
};
const COST_COLUMNS: Record<string, string> = {
  diag: "diagnosis",
  projExec: "executive_design",
  gerenc: "management",
  relFinal: "final_report",
  motOutros: "other_services",
  mkt: "marketing",
  trein: "training",
  desc: "disposal",
  mv: "measurement_verification",
  contrapartida: "counterpart",
};

function mapped(table: Record<string, string>, value: string | undefined, what: string) {
  if (value === undefined) return undefined;
  const out = table[value];
  if (!out) throw new Error(`Unknown ${what}: ${value}`);
  return out;
}

function num(value: Num, fallback = 0): number {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalNum(value: Num): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

export function convertCallRules(call: ProtoCall): CallRules {
  const rules: Record<string, unknown> = {
    typologies: call.tipologias?.map((t) => ({
      name: t.nome,
      budget: t.recurso,
      min: t.min,
      max: t.max,
      modalityNote: t.modalidade,
    })),
    maxBcr: call.rcbMax && {
      fp: call.rcbMax.fp,
      cd: call.rcbMax.cd,
      incentivizedOnly: call.rcbMax.fi,
    },
    discountRate: call.taxaDesconto,
    peakHours: call.horarioPonta,
    executionPeriod: call.prazoExecucao,
    performanceContractReturn: call.retornoCD,
    limits:
      call.limites &&
      Object.fromEntries(
        Object.entries(call.limites).map(([k, v]) => [
          mapped(LIMIT_KEYS, k, "limit"),
          typeof v === "number" ? v : { pct: v.pct, cap: v.teto },
        ]),
      ),
    mop: call.mop && { fixed: call.mop.fixo, pct: call.mop.pct },
    avoidedCosts: call.custosEvitados?.map((c) => ({
      level: c.nivel,
      description: c.desc,
      energyCost: c.cee,
      demandCost: c.ced,
    })),
    checklist: call.checklist?.map((it) => ({
      id: it.id,
      group: it.grupo,
      name: it.nome,
      ref: it.ref,
      appliesTo: mapped(APPLIES_TO, it.aplica, "checklist applicability"),
      scope: it.escopo === "uc" ? "consumer_unit" : "proposal",
      hint: it.dica,
      validity: mapped(VALIDITY, it.validade, "document validity"),
      optional: it.opcional,
    })),
    rules: call.regras?.map((r) => ({ text: r.t, ref: r.ref })),
    scoring: call.pontuacao?.map((s) => ({ item: s.item, criterion: s.criterio, points: s.pontos })),
    minPhotos: call.fotosMinimas?.map((f) => ({ stage: f.etapa, count: f.qtd })),
  };
  // Drop empty sections and undefined fields before validating.
  return callRulesSchema.parse(JSON.parse(JSON.stringify(rules)));
}

export function convertUtility(u: ProtoUtility) {
  return {
    name: u.nome,
    short_name: u.sigla,
    state: u.uf ?? null,
    concession_area: u.area ?? null,
    website: u.site ?? null,
    pee_email: u.emailPEE ?? null,
    submission_url: u.linkSubmissao ?? null,
    address: u.endereco ?? null,
  };
}

export function convertCall(c: ProtoCall) {
  return {
    code: c.codigo,
    name: c.nome,
    status: mapped(CALL_STATUS, c.status, "call status") ?? "to_verify",
    published_on: c.publicacao ?? null,
    submission_deadline: c.prazoSubmissao ?? null,
    deadline_note: c.prazoNota ?? null,
    total_budget: c.recursoTotal ?? null,
    call_url: c.linkEdital ?? null,
    submission_url: c.linkSubmissao ?? null,
    clarification_email: c.emailEsclarecimento ?? null,
    clarification_subject: c.assuntoEsclarecimento ?? null,
    notes: c.notas ?? null,
    rules: convertCallRules(c),
  };
}

export function convertClient(c: ProtoClient) {
  return {
    name: c.nome,
    kind: c.tipo ?? null,
    cnpj: c.cnpj ?? null,
    municipality: c.municipio ?? null,
    state: c.uf ?? null,
    typology: c.tipologia ?? null,
    modality: c.modalidade === "fp" || c.modalidade === "cd" ? c.modalidade : null,
    status: mapped(CLIENT_STATUS, c.status, "client status") ?? "lead",
    next_action_on: c.proximaAcao?.data || null,
    next_action: c.proximaAcao?.texto || null,
    notes: c.notas ?? null,
    is_example: Boolean(c.exemplo),
  };
}

export function convertContact(c: ProtoContact) {
  return {
    name: c.nome,
    job_title: c.cargo ?? null,
    email: c.email ?? null,
    phone: c.telefone ?? null,
    is_primary: Boolean(c.principal),
  };
}

export function convertProject(p: ProtoProject) {
  const f = p.flags ?? {};
  return {
    name: p.nome,
    typology: p.tipologia ?? null,
    modality: p.modalidade === "cd" ? "cd" : "fp",
    voltage_level: p.nivelTensao ?? null,
    municipality: p.municipio ?? null,
    stage: mapped(STAGE_FROM_PROTO, p.etapa, "project stage") ?? "prospecting",
    is_micro_small_business: Boolean(f.meEpp),
    has_non_removable_uses: Boolean(f.naoRemovivel),
    is_heritage_listed: Boolean(f.tombado),
    has_incentivized_source: Boolean(f.fonteIncentivada),
    requires_public_bidding: Boolean(f.licitacao),
    folder_url: p.pastaOneDrive ?? null,
    responsible: p.responsavel ?? null,
    next_action_on: p.proximaAcao?.data || null,
    next_action: p.proximaAcao?.texto || null,
    is_example: Boolean(p.exemplo),
  };
}

export function convertAction(a: ProtoAction, position: number) {
  return {
    end_use: a.uso,
    description: a.desc ?? null,
    quantity: num(a.qtd),
    power_before_w: num(a.pa),
    power_after_w: num(a.pd),
    hours_per_year: num(a.horas),
    peak_hours_per_day: num(a.nup),
    peak_days_per_month: num(a.nd),
    months_per_year: num(a.nm),
    useful_life_years: num(a.vida, 1),
    unit_cost: num(a.custo),
    energy_saved_mwh_override: optionalNum(a.eeManual),
    peak_reduction_kw_override: optionalNum(a.rdpManual),
    position,
  };
}

export function convertCosts(costs: ProtoProject["custos"] = {}) {
  const out: Record<string, number> = {};
  for (const [key, column] of Object.entries(COST_COLUMNS)) out[column] = num(costs[key]);
  return out;
}

/** Splits "item__unitId" document keys into checklist item and unit. */
export function convertDocument(key: string, d: ProtoDocument) {
  const [itemKey, unitId] = key.split("__");
  return {
    itemKey,
    unitId: unitId ?? null,
    row: {
      item_key: itemKey,
      status: mapped(DOCUMENT_STATUS, d.status, "document status") ?? "pending",
      file_path: d.arquivo ?? null,
      issued_on: d.emissao || null,
      valid_until: d.validade || null,
      notes: d.obs ?? null,
    },
  };
}

export function convertExecutionStep(key: string, s: { status?: string; inicio?: string; fim?: string }) {
  return {
    step_key: key,
    status: mapped(STEP_STATUS, s.status, "step status") ?? "todo",
    started_on: s.inicio || null,
    finished_on: s.fim || null,
  };
}

export function convertInteraction(i: ProtoInteraction) {
  return {
    kind: mapped(INTERACTION_KIND, i.tipo, "interaction kind")!,
    occurred_on: i.data,
    summary: i.resumo,
    author_name: i.por ?? null,
    is_example: Boolean(i.exemplo),
  };
}
