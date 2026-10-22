/** Problems that block a proposal, and the project's next step. */
import { calcProject } from "./calc";
import { documentRows, summarizeDocuments } from "./documents";
import { mi, nf } from "./format";
import type { ProjectBundle, Stage } from "./types";

/** Stages before submission, when missing documents are still expected. */
export const PREPARATION_STAGES: Stage[] = ["prospecting", "site_visit", "documentation", "diagnosis", "ready"];

export type IssueArea = "docs" | "rcb" | "conflicts";

export interface Issue {
  tone: "bad" | "warn";
  text: string;
  area: IssueArea;
}

export const NEXT_STEP_HINT: Record<Stage, string> = {
  prospecting: "Apresente o PEE ao cliente e agende a visita técnica.",
  site_visit: "Faça a visita técnica: fotos das placas, horários de uso e faturas.",
  documentation: "Reúna os documentos que faltam e confira as validades.",
  diagnosis: "Cadastre as ações de eficiência e confira se a RCB fica abaixo do limite.",
  ready: "Revise a conferência final e envie a proposta no sistema da distribuidora.",
  submitted: "Acompanhe o resultado e responda a pedidos de esclarecimento.",
  approved: "Envie a documentação do contrato e agende a reunião de abertura.",
  execution: "Atualize as etapas da obra e guarde as fotos de antes e depois.",
  mv: "Conclua a medição pós-obra e o relatório final.",
  completed: "Projeto concluído.",
  lost: "Registre o motivo e avalie reapresentar na próxima chamada.",
};

/**
 * Lists what would disqualify or delay the proposal. `others` are the
 * organization's other projects, used to find conflicts in the same call.
 * Cost checks run only when actions and costs are available to the viewer.
 */
export function projectIssues(bundle: ProjectBundle, others: ProjectBundle[], today: string): Issue[] {
  const { project, call } = bundle;
  const out: Issue[] = [];
  if (!call) return out;

  const docs = summarizeDocuments(documentRows(project, call, bundle.units, bundle.documents, today));
  if (docs.expired) out.push({ tone: "bad", text: `${docs.expired} documento(s) fora da validade`, area: "docs" });
  if (docs.missing) {
    out.push({
      tone: PREPARATION_STAGES.includes(project.stage) ? "warn" : "bad",
      text: `${docs.missing} documento(s) faltando`,
      area: "docs",
    });
  }

  if (call.rules.maxBcr && bundle.actions?.length) {
    const k = calcProject(project, call, bundle.actions, bundle.costs);
    if (Number.isFinite(k.rcbPee) && k.rcbMax != null && k.rcbPee > k.rcbMax) {
      out.push({ tone: "bad", text: `RCB ${nf(k.rcbPee)} acima do limite ${nf(k.rcbMax)}`, area: "rcb" });
    }
    for (const c of k.checks.filter((x) => !x.ok)) {
      out.push({ tone: "bad", text: `${c.name} acima do limite (${c.ref})`, area: "rcb" });
    }
    if (k.typology && (k.peeTotal < k.typology.min || k.peeTotal > k.typology.max)) {
      out.push({ tone: "bad", text: `Valor PEE ${mi(k.peeTotal)} fora da faixa da tipologia`, area: "rcb" });
    }
  }

  const numbers = bundle.units.map((u) => u.number).filter(Boolean);
  for (const o of others) {
    if (o.project.id === project.id || o.project.call_id !== project.call_id || o.project.stage === "lost") {
      continue;
    }
    const shared = o.units.filter((u) => numbers.includes(u.number));
    if (shared.length) {
      out.push({
        tone: "bad",
        text: `UC ${shared[0].number} também está em "${o.project.name}"`,
        area: "conflicts",
      });
    }
    if (
      project.typology === "Iluminação Pública" &&
      o.project.typology === "Iluminação Pública" &&
      project.municipality &&
      o.project.municipality === project.municipality
    ) {
      out.push({ tone: "bad", text: "Outro projeto de IP no mesmo município", area: "conflicts" });
    }
  }
  return out;
}

/** Turns an issue into an instruction, using the short project name. */
export function issueAction(issue: Issue, projectName: string) {
  const short = projectName.split(" · ")[0];
  if (issue.area === "docs" && /fora da validade/.test(issue.text)) {
    return `Renovar ${issue.text.replace(" fora da validade", "")} vencido(s) de ${short}`;
  }
  if (issue.area === "docs") return `Juntar ${issue.text.replace(" faltando", "")} pendente(s) de ${short}`;
  return `${short}: ${issue.text}`;
}

export interface NextStep {
  text: string;
  /** Where to fix it, when the next step is a blocking issue. */
  area: IssueArea | null;
  /** How many other blocking issues remain. */
  more: number;
}

/** The first blocking issue, or the usual task for the current stage. */
export function nextStep(bundle: ProjectBundle, others: ProjectBundle[], today: string): NextStep {
  const blocking = projectIssues(bundle, others, today).filter((i) => i.tone === "bad");
  if (blocking.length) {
    return { text: issueAction(blocking[0], bundle.project.name), area: blocking[0].area, more: blocking.length - 1 };
  }
  return { text: NEXT_STEP_HINT[bundle.project.stage], area: null, more: 0 };
}
