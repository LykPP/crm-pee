/** Document checklist: which items apply and whether each one is valid. */
import type { ChecklistItem } from "@/lib/calls/rules-schema";
import { addDays, addMonths, daysBetween } from "./dates";
import type { Call, ConsumerUnit, Project, ProjectDocument } from "./types";

export type DocumentStatusKind = "ok" | "missing" | "expired" | "no_date" | "optional" | "na";
export type Tone = "ok" | "warn" | "bad" | "";

export interface DocumentStatus {
  kind: DocumentStatusKind;
  tone: Tone;
  label: string;
}

export interface DocumentRow {
  item: ChecklistItem;
  /** Null for items scoped to the whole proposal. */
  unit: ConsumerUnit | null;
  record: ProjectDocument | null;
  status: DocumentStatus;
}

export function itemApplies(item: ChecklistItem, p: Project) {
  switch (item.appliesTo) {
    case "fp":
      return p.modality === "fp";
    case "cd":
      return p.modality === "cd";
    case "cd_micro_small_business":
      return p.modality === "cd" && p.is_micro_small_business;
    case "non_removable_uses":
      return p.modality === "fp" && p.has_non_removable_uses;
    case "heritage_listed":
      return p.is_heritage_listed;
    case "incentivized_source":
      return p.has_incentivized_source;
    default:
      return true;
  }
}

/**
 * Validity rules:
 * - certificate: valid on the submission deadline; warns when it expires
 *   less than 15 days after it.
 * - bill_3_months: issued at most 3 months before the deadline.
 * - quote_3_months: issued at most 3 months before the call publication.
 * - property_30_days: issued at most 30 days before the deadline.
 * Without a deadline, today is used.
 */
export function documentStatus(
  item: ChecklistItem,
  record: ProjectDocument | null,
  call: Call,
  today: string,
): DocumentStatus {
  if (record?.status === "na") return { kind: "na", tone: "", label: "Não se aplica" };
  if (record?.status !== "ok") {
    return item.optional
      ? { kind: "optional", tone: "", label: "Opcional" }
      : { kind: "missing", tone: "bad", label: "Falta" };
  }

  const deadline = call.submission_deadline || today;
  switch (item.validity) {
    case "certificate":
      if (!record.valid_until) return { kind: "no_date", tone: "warn", label: "Sem validade" };
      if (record.valid_until < deadline) {
        return { kind: "expired", tone: "bad", label: "Vence antes do prazo" };
      }
      if (daysBetween(deadline, record.valid_until) < 15) {
        return { kind: "ok", tone: "warn", label: "Vence logo após o prazo" };
      }
      break;
    case "bill_3_months":
      if (!record.issued_on) return { kind: "no_date", tone: "warn", label: "Sem data" };
      if (record.issued_on < addMonths(deadline, -3)) {
        return { kind: "expired", tone: "bad", label: "Fatura antiga (>3 meses)" };
      }
      break;
    case "quote_3_months":
      if (!record.issued_on) return { kind: "no_date", tone: "warn", label: "Sem data" };
      if (record.issued_on < addMonths(call.published_on || deadline, -3)) {
        return { kind: "expired", tone: "bad", label: "Orçamento antigo (>3 meses)" };
      }
      break;
    case "property_30_days":
      if (!record.issued_on) return { kind: "no_date", tone: "warn", label: "Sem data" };
      if (record.issued_on < addDays(deadline, -30)) {
        return { kind: "expired", tone: "bad", label: "Certidão com mais de 30 dias" };
      }
      break;
  }
  return { kind: "ok", tone: "ok", label: "Completo" };
}

/**
 * One row per applicable checklist item; items scoped to consumer units
 * get one row per unit (or a single placeholder row when there are none).
 */
export function documentRows(
  project: Project,
  call: Call | null,
  units: ConsumerUnit[],
  documents: ProjectDocument[],
  today: string,
): DocumentRow[] {
  const rows: DocumentRow[] = [];
  if (!call?.rules.checklist) return rows;
  const find = (key: string, unitId: string | null) =>
    documents.find((d) => d.item_key === key && d.consumer_unit_id === unitId) ?? null;

  for (const item of call.rules.checklist) {
    if (!itemApplies(item, project)) continue;
    const targets: (ConsumerUnit | null)[] =
      item.scope === "consumer_unit" ? (units.length ? units : [null]) : [null];
    for (const unit of targets) {
      // A unit-scoped item without units has nowhere to store a record.
      const record = item.scope === "consumer_unit" && !unit ? null : find(item.id, unit?.id ?? null);
      rows.push({ item, unit, record, status: documentStatus(item, record, call, today) });
    }
  }
  return rows;
}

export interface DocumentSummary {
  total: number;
  ok: number;
  expired: number;
  noDate: number;
  missing: number;
  pct: number;
}

/** Counts required documents; optional and not applicable items are left out. */
export function summarizeDocuments(rows: DocumentRow[]): DocumentSummary {
  const required = rows.filter((r) => !r.item.optional && r.status.kind !== "na");
  const count = (kind: DocumentStatusKind) => required.filter((r) => r.status.kind === kind).length;
  const ok = count("ok");
  return {
    total: required.length,
    ok,
    expired: count("expired"),
    noDate: count("no_date"),
    missing: count("missing"),
    pct: required.length ? ok / required.length : 0,
  };
}
