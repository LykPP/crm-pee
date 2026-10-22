/** Execution stages of an approved project, as in the prototype. */
import type { Project } from "./types";

export const EXECUTION_STEPS: [string, string][] = [
  ["diag", "Diagnóstico energético"],
  ["linhaBase", "Medição de linha de base e Plano de M&V"],
  ["aquisicao", "Aquisição de materiais e equipamentos"],
  ["execucao", "Execução das ações de eficiência"],
  ["descarte", "Descarte dos equipamentos substituídos"],
  ["marketing", "Ações de marketing"],
  ["treinamento", "Treinamento e capacitação"],
  ["mvPos", "Medição pós-retrofit e Relatório de M&V"],
  ["relatorio", "Avaliação de resultados e Relatório final"],
  ["licitacao", "Licitação (se houver)"],
];

export type StepStatus = "todo" | "in_progress" | "done";

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Concluída",
};

export interface ExecutionStep {
  step_key: string;
  status: StepStatus;
  started_on: string | null;
  finished_on: string | null;
}

/** The bidding step only applies when the public client must run one. */
export function executionSteps(project: Pick<Project, "requires_public_bidding">) {
  return EXECUTION_STEPS.filter(([key]) => key !== "licitacao" || project.requires_public_bidding);
}
