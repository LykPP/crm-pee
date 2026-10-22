/** The five phases that group the eleven project stages. */
import { calcProject } from "./calc";
import type { ProjectBundle, Stage } from "./types";

export const STAGE_LABELS: Record<Stage, string> = {
  prospecting: "Prospecção",
  site_visit: "Visita técnica",
  documentation: "Documentação",
  diagnosis: "Diagnóstico e RCB",
  ready: "Pronto para submeter",
  submitted: "Submetido",
  approved: "Aprovado",
  execution: "Em execução",
  mv: "M&V e relatório",
  completed: "Concluído",
  lost: "Não aprovado",
};

export const STAGES = Object.keys(STAGE_LABELS) as Stage[];

export const PHASES: { name: string; stages: Stage[]; hint: string }[] = [
  { name: "Prospecção", stages: ["prospecting", "site_visit"], hint: "Primeiro contato e visita técnica" },
  { name: "Preparação", stages: ["documentation", "diagnosis"], hint: "Documentos, diagnóstico e RCB" },
  { name: "Submissão", stages: ["ready", "submitted"], hint: "Pronto para enviar ou já enviado" },
  { name: "Execução", stages: ["approved", "execution", "mv"], hint: "Obra, M&V e relatório" },
  { name: "Encerrado", stages: ["completed", "lost"], hint: "Concluído ou não aprovado" },
];

export function phaseIndex(stage: Stage) {
  return Math.max(0, PHASES.findIndex((p) => p.stages.includes(stage)));
}

export interface Verdict {
  tone: "ok" | "bad" | "";
  label: string;
}

/** Feasibility badge: whether RCB, rubric limits and typology range pass. */
export function feasibility(bundle: ProjectBundle): Verdict {
  if (!bundle.actions?.length) return { tone: "", label: "Sem cálculo" };
  const k = calcProject(bundle.project, bundle.call, bundle.actions, bundle.costs);
  if (!Number.isFinite(k.rcbPee)) return { tone: "", label: "Sem cálculo" };
  const bad =
    (k.rcbMax != null && k.rcbPee > k.rcbMax) ||
    k.checks.some((c) => !c.ok) ||
    (k.typology != null && (k.peeTotal < k.typology.min || k.peeTotal > k.typology.max));
  return bad ? { tone: "bad", label: "Revisar viabilidade" } : { tone: "ok", label: "Viável" };
}
