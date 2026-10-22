/**
 * PEE budget and cost-benefit ratio (RCB), following PROPEE module 7 as
 * implemented in the prototype. This is an estimate: the utility's
 * official spreadsheet prevails.
 */
import type { RubricLimit } from "@/lib/calls/rules-schema";
import { brl } from "./format";
import type { Call, EfficiencyAction, Project, ProjectCosts } from "./types";

/** PROPEE default when the call does not state a discount rate. */
const DEFAULT_DISCOUNT_RATE = 0.08;
/** Peak window used in the coincidence factor: 3 h × 22 days × 12 months. */
const PEAK_HOURS_PER_YEAR = 792;

export interface ActionResult extends EfficiencyAction {
  /** Demand reduction, kW. */
  demandReductionKw: number;
  /** Peak coincidence factor, 0 to 1. */
  coincidenceFactor: number;
  /** Energy saved, MWh/year. */
  energySavedMwh: number;
  /** Reduction in peak demand, kW. */
  peakReductionKw: number;
  /** Equipment cost, R$. */
  cost: number;
  /** Annual benefit from avoided costs, R$. */
  benefit: number;
}

export interface LimitCheck {
  name: string;
  ref: string;
  value: number;
  max: number;
  ok: boolean;
  description: string;
}

export interface CalcResult {
  actions: ActionResult[];
  equipment: number;
  thirdPartyLabor: number;
  marketing: number;
  training: number;
  disposal: number;
  measurementVerification: number;
  counterpart: number;
  mop: number;
  admp: number;
  peeTotal: number;
  total: number;
  annualBenefit: number;
  energySavedMwh: number;
  peakReductionKw: number;
  /** RCB of the PEE share. */
  rcbPee: number;
  /** RCB including the counterpart. */
  rcbTotal: number;
  /** Maximum RCB for this project, or null when the call does not say. */
  rcbMax: number | null;
  incentivizedOnly: boolean;
  typology: { name: string; min: number; max: number } | null;
  checks: LimitCheck[];
  avoidedCost: { energyCost: number; demandCost: number };
}

const ZERO_COSTS: ProjectCosts = {
  diagnosis: 0,
  executive_design: 0,
  management: 0,
  final_report: 0,
  other_services: 0,
  marketing: 0,
  training: 0,
  disposal: 0,
  measurement_verification: 0,
  counterpart: 0,
};

/** Capital recovery factor for n years at rate i. */
export function capitalRecoveryFactor(i: number, years: number) {
  const n = Math.max(1, Number(years) || 1);
  const a = Math.pow(1 + i, n);
  return (i * a) / (a - 1);
}

export function calcProject(
  project: Project,
  call: Call | null,
  actionsIn: EfficiencyAction[],
  costsIn: ProjectCosts | null | undefined,
): CalcResult {
  const rules = call?.rules ?? {};
  const limits = rules.limits ?? {};
  const avoided = rules.avoidedCosts?.find((c) => c.level === project.voltage_level) ?? {
    energyCost: 0,
    demandCost: 0,
  };
  const i = rules.discountRate ?? DEFAULT_DISCOUNT_RATE;
  const c = { ...ZERO_COSTS, ...(costsIn ?? {}) };
  const n = (v: unknown) => Number(v) || 0;

  const actions: ActionResult[] = actionsIn.map((a) => {
    const q = n(a.quantity);
    const demandReductionKw = (q * (n(a.power_before_w) - n(a.power_after_w))) / 1000;
    const coincidenceFactor = Math.min(
      1,
      (n(a.peak_hours_per_day) * n(a.peak_days_per_month) * n(a.months_per_year)) / PEAK_HOURS_PER_YEAR,
    );
    const energySavedMwh =
      a.energy_saved_mwh_override != null && n(a.energy_saved_mwh_override) > 0
        ? n(a.energy_saved_mwh_override)
        : (demandReductionKw * n(a.hours_per_year)) / 1000;
    const peakReductionKw =
      a.peak_reduction_kw_override != null && n(a.peak_reduction_kw_override) > 0
        ? n(a.peak_reduction_kw_override)
        : demandReductionKw * coincidenceFactor;
    const cost = q * n(a.unit_cost);
    return {
      ...a,
      demandReductionKw,
      coincidenceFactor,
      energySavedMwh,
      peakReductionKw,
      cost,
      benefit: energySavedMwh * avoided.energyCost + peakReductionKw * avoided.demandCost,
    };
  });

  const E = actions.reduce((s, a) => s + a.cost, 0);
  const MOT = n(c.diagnosis) + n(c.executive_design) + n(c.management) + n(c.final_report) + n(c.other_services);
  const MKT = n(c.marketing);
  const TR = n(c.training);
  const DS = n(c.disposal);
  const MV = n(c.measurement_verification);
  const CP = n(c.counterpart);

  // Utility's own cost (MOP) and administration (ADMP), per PROPEE.
  const mop = rules.mop ? rules.mop.fixed + rules.mop.pct * (E + MOT + MKT + TR + DS + MV) : 0;
  const admp = Math.max(0, (E + MOT + TR + DS + MV) / 19 - MKT);
  const peeTotal = E + MOT + MKT + TR + DS + MV + mop + admp;
  const total = peeTotal + CP;

  // Indirect costs are spread over actions by their share of equipment cost
  // and annualized over each action's useful life.
  let annualizedPee = 0;
  let annualizedTotal = 0;
  for (const a of actions) {
    const share = E ? a.cost / E : 0;
    const crf = capitalRecoveryFactor(i, a.useful_life_years);
    annualizedPee += (a.cost + (peeTotal - E) * share) * crf;
    annualizedTotal += (a.cost + (total - E) * share) * crf;
  }
  const annualBenefit = actions.reduce((s, a) => s + a.benefit, 0);

  const incentivizedOnly = actions.length > 0 && actions.every((a) => /Fonte incentivada/.test(a.end_use));
  const rcbMax = rules.maxBcr
    ? ((incentivizedOnly ? rules.maxBcr.incentivizedOnly : rules.maxBcr[project.modality]) ?? null)
    : null;

  const typology = rules.typologies?.find((t) => t.name === project.typology) ?? null;

  const check = (value: number, cfg: RubricLimit | undefined, name: string, ref: string) => {
    if (cfg == null) return null;
    const pct = typeof cfg === "number" ? cfg : cfg.pct;
    const cap = typeof cfg === "number" ? Infinity : (cfg.cap ?? Infinity);
    const max = Math.min(pct * peeTotal, cap);
    return {
      name,
      ref,
      value,
      max,
      ok: value <= max + 0.5,
      description:
        (pct * 100).toLocaleString("pt-BR") + "% do PEE" + (Number.isFinite(cap) ? " ou " + brl(cap) : ""),
    };
  };
  const checks = [
    check(MOT, limits.thirdPartyLabor, "Mão de obra de terceiros (total)", "ET 5.4.1"),
    check(n(c.diagnosis), limits.diagnosis, "Diagnóstico energético", "ET 5.4.1.1"),
    check(n(c.executive_design), limits.executiveDesign, "Projeto executivo", "ET 5.4.1.2"),
    check(n(c.management), limits.management, "Gerenciamento", "ET 5.4.1.3"),
    check(n(c.final_report), limits.finalReport, "Relatório final", "ET 5.4.1.4"),
    check(MV, limits.measurementVerification, "Medição e verificação", "ET 5.4.2"),
    check(MKT, limits.marketing, "Marketing", "ET 5.4.3"),
    check(TR, limits.training, "Treinamento e capacitação", "ET 5.4.4"),
  ].filter((x): x is LimitCheck => x !== null);

  return {
    actions,
    equipment: E,
    thirdPartyLabor: MOT,
    marketing: MKT,
    training: TR,
    disposal: DS,
    measurementVerification: MV,
    counterpart: CP,
    mop,
    admp,
    peeTotal,
    total,
    annualBenefit,
    energySavedMwh: actions.reduce((s, a) => s + a.energySavedMwh, 0),
    peakReductionKw: actions.reduce((s, a) => s + a.peakReductionKw, 0),
    rcbPee: annualBenefit ? annualizedPee / annualBenefit : NaN,
    rcbTotal: annualBenefit ? annualizedTotal / annualBenefit : NaN,
    rcbMax,
    incentivizedOnly,
    typology: typology && { name: typology.name, min: typology.min, max: typology.max },
    checks,
    avoidedCost: { energyCost: avoided.energyCost, demandCost: avoided.demandCost },
  };
}
