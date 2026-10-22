import { describe, expect, it } from "vitest";
import { clientMessage, type ClientMessageKind } from "@/lib/messages";
import { feasibility, folderTree, phaseIndex } from "@/lib/pee";
import { seedCalls, seedClients, seedProjects, seedUtilities } from "@/lib/seed/data";
import { convertClient } from "@/lib/seed/prototype";
import { exampleBundles } from "./fixtures";
import { loadPrototype } from "./prototype-runtime";

const proto = loadPrototype();
const bundles = exampleBundles();
const TODAY = "2026-10-22";

describe("feasibility badge matches the prototype", () => {
  it.each(Object.keys(bundles))("%s", (id) => {
    const theirs = proto.verdictOf(proto.S.projetos[id]);
    expect(feasibility(bundles[id])).toEqual({ tone: theirs.c, label: theirs.t });
  });
});

describe("phases", () => {
  it("groups stages like the prototype", () => {
    expect(phaseIndex("prospecting")).toBe(0);
    expect(phaseIndex("diagnosis")).toBe(1);
    expect(phaseIndex("submitted")).toBe(2);
    expect(phaseIndex("mv")).toBe(3);
    expect(phaseIndex("lost")).toBe(4);
  });
});

describe.each(Object.keys(seedClients))("messages for client %s match the prototype", (clientId) => {
  const c = seedClients[clientId];
  const contact = c.contatos?.find((x) => x.principal) ?? c.contatos?.[0];
  const projectKey = Object.keys(seedProjects).find(
    (k) => seedProjects[k].clienteId === clientId && seedProjects[k].etapa !== "perdido",
  );
  const callKey = projectKey
    ? seedProjects[projectKey].editalId!
    : Object.keys(seedCalls).find((k) => seedCalls[k].status === "aberto");
  const call = callKey ? seedCalls[callKey] : undefined;

  it.each(["presentation", "visit", "documents"] as ClientMessageKind[])("%s", (kind) => {
    const protoKind = { presentation: "apresentacao", visit: "visita", documents: "documentos" }[kind];
    const theirs = proto.tplCliente(proto.S.clientes[clientId], protoKind);
    const row = convertClient(c);
    const mine = clientMessage(kind, {
      client: { ...row, modality: row.modality as "fp" | "cd" | null },
      contactName: contact?.nome,
      project: projectKey ? bundles[projectKey] : null,
      call: call && {
        code: call.codigo,
        submission_deadline: call.prazoSubmissao ?? null,
        utilityName: seedUtilities[call.distribuidoraId]?.nome ?? null,
      },
      today: TODAY,
    });
    expect(mine.subject).toBe(theirs.assunto);
    expect(mine.body).toBe(theirs.corpo);
  });
});

describe("suggested folder tree matches the prototype", () => {
  it.each(Object.keys(bundles))("%s", (id) => {
    const p = proto.S.projetos[id];
    const b = bundles[id];
    expect(folderTree(b.project.name, b.units.map((u) => u.number))).toBe(proto.folderTree(p));
  });
});
