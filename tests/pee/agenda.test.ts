import { describe, expect, it } from "vitest";
import { agendaEvents, nextDeadline, relativeDay, reminders, todayTasks, type AgendaInput } from "@/lib/agenda";
import { seedCalls, seedClients } from "@/lib/seed/data";
import { convertCall, convertClient } from "@/lib/seed/prototype";
import { exampleBundles } from "./fixtures";

const TODAY = "2026-10-22";

function input(): AgendaInput {
  const projects = Object.values(exampleBundles());
  return {
    projects,
    clients: Object.entries(seedClients).map(([id, c]) => ({ id, ...convertClient(c) })),
    calls: Object.entries(seedCalls).map(([id, c]) => {
      const row = convertCall(c);
      return { id, utilityShortName: "Cemig D", ...row };
    }),
    steps: [
      { project_id: projects[0].project.id, step_key: "diag", status: "in_progress", started_on: "2026-10-01", finished_on: "2026-10-30" },
      { project_id: projects[0].project.id, step_key: "aquisicao", status: "done", started_on: null, finished_on: "2026-10-25" },
    ],
  };
}

describe("today's tasks", () => {
  it("puts blocking issues first, then next actions due within two days", () => {
    const tasks = todayTasks(input(), TODAY);
    expect(tasks.map((t) => [t.tone, t.title, t.subtitle])).toEqual([
      ["bad", "Renovar 3 documento(s) vencido(s) de Hospital São Lucas", "Documentação"],
      ["bad", "Renovar 1 documento(s) vencido(s) de Escolas Polo Monte Claro", "Pronto para submeter"],
      ["warn", "Confirmar que não há liminar sobre ativos de IP", "Prefeitura de Vale do Sereno · atrasado desde 20/10/2026"],
      ["", "Emitir nova CND federal e submeter no SiSPEE", "Escolas Polo Monte Claro · LED e climatização · hoje"],
      ["", "Cobrar CND municipal e anuência assinada", "Hospital Beneficente São Lucas · 23/10/2026"],
      ["", "Atualizar orçamentos e fatura do anexo", "Hospital São Lucas · LED e climatização · 23/10/2026"],
      ["", "Visita técnica: câmaras frias e motores", "Laticínios Serra Verde · 24/10/2026"],
    ]);
    // Next actions from the 25th on are reminders, not tasks for today.
    expect(tasks.some((t) => t.title.startsWith("Enviar apresentação"))).toBe(false);
    expect(tasks[0].href).toMatch(/aba=documentos$/);
  });

  it("marks late next actions", () => {
    const i = input();
    const hospital = i.clients.find((c) => c.name.startsWith("Hospital"))!;
    hospital.next_action_on = "2026-10-01";
    const late = todayTasks(i, TODAY).find((t) => t.title === hospital.next_action);
    expect(late).toMatchObject({ tone: "warn", subtitle: "Hospital Beneficente São Lucas · atrasado desde 01/10/2026" });
  });
});

describe("agenda", () => {
  it("collects next actions, call deadlines, expiring documents and execution stages", () => {
    const events = agendaEvents(input(), TODAY);
    const kinds = new Set(events.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["next_action", "call_deadline", "document_expiry", "step"]));
    expect(events).toContainEqual(
      expect.objectContaining({ date: "2026-11-06", kind: "call_deadline", subject: "Cemig D CPP 001/2026" }),
    );
    expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort());
    // A finished stage is not a reminder anymore.
    expect(events.some((e) => e.title.includes("Aquisição"))).toBe(false);
  });

  it("reminders cover the coming days only", () => {
    const list = reminders(input(), TODAY, 30);
    expect(list.every((e) => e.date >= TODAY && e.date <= "2026-11-21")).toBe(true);
    expect(list.some((e) => e.kind === "document_expiry" && e.title.startsWith("Certidão negativa estadual"))).toBe(true);
  });

  it("counts down to the nearest open call", () => {
    expect(nextDeadline(input(), TODAY)).toMatchObject({ label: "Cemig D CPP 001/2026", days: 15, ready: 1, preparing: 4 });
  });

  it("describes dates relative to today", () => {
    expect(relativeDay("2026-10-22", TODAY)).toBe("hoje");
    expect(relativeDay("2026-10-23", TODAY)).toBe("amanhã");
    expect(relativeDay("2026-10-30", TODAY)).toBe("em 8 dias");
    expect(relativeDay("2026-10-20", TODAY)).toBe("há 2 dias");
  });
});
