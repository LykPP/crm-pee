/**
 * Everything with a date in the organization: next actions, call deadlines,
 * document validity and execution stages. The home page tasks, the
 * reminders and the calendar are all views of this one list.
 */
import { formatDate } from "@/lib/labels";
import {
  EXECUTION_STEPS,
  PREPARATION_STAGES,
  STAGE_LABELS,
  addDays,
  daysBetween,
  issueAction,
  projectIssues,
  type ExecutionStep,
  type IssueArea,
  type ProjectBundle,
} from "@/lib/pee";

export type EventKind = "next_action" | "call_deadline" | "call_published" | "document_expiry" | "step";

export interface AgendaEvent {
  date: string;
  kind: EventKind;
  title: string;
  /** Who or what it is about: client, project or call. */
  subject: string;
  href: string;
  tone: "" | "warn" | "bad" | "ok";
}

export interface AgendaCall {
  id: string;
  code: string;
  utilityShortName: string | null;
  status: string;
  published_on: string | null;
  submission_deadline: string | null;
}

export interface AgendaClient {
  id: string;
  name: string;
  next_action_on: string | null;
  next_action: string | null;
}

export interface AgendaInput {
  calls: AgendaCall[];
  clients: AgendaClient[];
  projects: ProjectBundle[];
  steps: (ExecutionStep & { project_id: string })[];
}

export const EVENT_LABELS: Record<EventKind, string> = {
  next_action: "Próxima ação",
  call_deadline: "Prazo de edital",
  call_published: "Publicação de edital",
  document_expiry: "Validade de documento",
  step: "Etapa da obra",
};

const ACTIVE = (b: ProjectBundle) => !["completed", "lost"].includes(b.project.stage);
const projectHref = (id: string, tab?: string) => `/projetos/${id}${tab ? `?aba=${tab}` : ""}`;
const callLabel = (c: AgendaCall) => `${c.utilityShortName ?? ""} ${c.code}`.trim();

/** All dated events, in date order. */
export function agendaEvents(input: AgendaInput, today: string): AgendaEvent[] {
  const out: AgendaEvent[] = [];

  for (const c of input.clients) {
    if (c.next_action_on && c.next_action) {
      out.push({
        date: c.next_action_on,
        kind: "next_action",
        title: c.next_action,
        subject: c.name,
        href: `/clientes/${c.id}`,
        tone: c.next_action_on < today ? "warn" : "",
      });
    }
  }

  for (const b of input.projects) {
    const p = b.project;
    if (p.next_action_on && p.next_action) {
      out.push({
        date: p.next_action_on,
        kind: "next_action",
        title: p.next_action,
        subject: p.name,
        href: projectHref(p.id),
        tone: p.next_action_on < today ? "warn" : "",
      });
    }
    if (!ACTIVE(b) || !b.call?.rules.checklist) continue;
    // Certificates already registered as received that will expire.
    for (const d of b.documents) {
      if (d.status !== "ok" || !d.valid_until) continue;
      const item = b.call.rules.checklist.find((i) => i.id === d.item_key);
      if (!item) continue;
      const unit = b.units.find((u) => u.id === d.consumer_unit_id);
      out.push({
        date: d.valid_until,
        kind: "document_expiry",
        title: `${item.name}${unit ? ` (UC ${unit.number})` : ""} vence`,
        subject: p.name,
        href: projectHref(p.id, "documentos"),
        tone: d.valid_until < today ? "bad" : "",
      });
    }
  }

  for (const c of input.calls) {
    if (c.submission_deadline && c.status !== "closed") {
      out.push({
        date: c.submission_deadline,
        kind: "call_deadline",
        title: `Prazo de envio das propostas`,
        subject: callLabel(c),
        href: `/editais/${c.id}`,
        tone: "bad",
      });
    }
    if (c.published_on && c.status === "upcoming") {
      out.push({
        date: c.published_on,
        kind: "call_published",
        title: "Publicação prevista do edital",
        subject: callLabel(c),
        href: `/editais/${c.id}`,
        tone: "",
      });
    }
  }

  const projectName = new Map(input.projects.map((b) => [b.project.id, b.project.name]));
  for (const s of input.steps) {
    const label = EXECUTION_STEPS.find(([k]) => k === s.step_key)?.[1];
    const name = projectName.get(s.project_id);
    if (!label || !name) continue;
    if (s.started_on && s.status === "todo") {
      out.push({
        date: s.started_on,
        kind: "step",
        title: `Início: ${label}`,
        subject: name,
        href: projectHref(s.project_id, "execucao"),
        tone: "",
      });
    }
    if (s.finished_on && s.status !== "done") {
      out.push({
        date: s.finished_on,
        kind: "step",
        title: `Fim previsto: ${label}`,
        subject: name,
        href: projectHref(s.project_id, "execucao"),
        tone: s.finished_on < today ? "warn" : "",
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "pt-BR"));
}

export interface Task {
  tone: "" | "warn" | "bad";
  title: string;
  subtitle: string;
  href: string;
  order: string;
}

const TAB_FOR_AREA: Record<IssueArea, string | undefined> = {
  docs: "documentos",
  rcb: "viabilidade",
  conflicts: undefined,
};

/**
 * "O que fazer agora", as in the prototype: blocking issues of active
 * projects first, then next actions that are late or due within two days.
 */
export function todayTasks(input: AgendaInput, today: string): Task[] {
  const tasks: Task[] = [];
  const due = addDays(today, 2);
  const nextActions = [
    ...input.clients.map((c) => ({ ...c, href: `/clientes/${c.id}` })),
    ...input.projects.map((b) => ({ ...b.project, href: projectHref(b.project.id) })),
  ];
  for (const x of nextActions) {
    const date = x.next_action_on;
    if (!date || !x.next_action || date > due) continue;
    tasks.push({
      tone: date < today ? "warn" : "",
      title: x.next_action,
      subtitle: `${x.name} · ${date < today ? `atrasado desde ${formatDate(date)}` : date === today ? "hoje" : formatDate(date)}`,
      href: x.href,
      order: date,
    });
  }
  for (const b of input.projects.filter(ACTIVE)) {
    const blocking = projectIssues(b, input.projects, today).filter((i) => i.tone === "bad");
    if (!blocking.length) continue;
    tasks.push({
      tone: "bad",
      title: issueAction(blocking[0], b.project.name),
      subtitle:
        blocking.length > 1
          ? `e mais ${blocking.length - 1} problema(s) neste projeto`
          : STAGE_LABELS[b.project.stage],
      href: projectHref(b.project.id, TAB_FOR_AREA[blocking[0].area]),
      order: "0",
    });
  }
  return tasks.sort((a, b) => a.order.localeCompare(b.order));
}

/** Upcoming events for the reminders panel: the next `days` days, nothing overdue. */
export function reminders(input: AgendaInput, today: string, days = 30): AgendaEvent[] {
  const until = addDays(today, days);
  return agendaEvents(input, today).filter((e) => e.date >= today && e.date <= until);
}

/** "faltam 3 dias", "hoje", "amanhã". */
export function relativeDay(date: string, today: string) {
  const d = daysBetween(today, date);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
}

/** The open call with the nearest deadline, and how many of our proposals are ready. */
export function nextDeadline(input: AgendaInput, today: string) {
  const call = input.calls
    .filter((c) => c.status === "open" && c.submission_deadline && c.submission_deadline >= today)
    .sort((a, b) => a.submission_deadline!.localeCompare(b.submission_deadline!))[0];
  if (!call) return null;
  const inCall = input.projects.filter((b) => b.project.call_id === call.id);
  return {
    call,
    label: callLabel(call),
    days: daysBetween(today, call.submission_deadline!),
    ready: inCall.filter((b) => b.project.stage === "ready").length,
    preparing: inCall.filter((b) => PREPARATION_STAGES.includes(b.project.stage)).length,
  };
}
