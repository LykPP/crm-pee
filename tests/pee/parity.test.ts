import { describe, expect, it } from "vitest";
import {
  calcProject,
  documentRows,
  nextStep,
  projectIssues,
  summarizeDocuments,
} from "@/lib/pee";
import { exampleBundles } from "./fixtures";
import { loadPrototype } from "./prototype-runtime";

// Fixed date; every example call has a submission deadline, so the
// prototype never falls back to the real "today".
const TODAY = "2026-10-22";
const proto = loadPrototype();
const bundles = exampleBundles();
const all = Object.values(bundles);
const ids = Object.keys(bundles);

describe.each(ids)("project %s matches the prototype", (id) => {
  const b = bundles[id];
  const p = proto.S.projetos[id];

  it("budget and RCB", () => {
    const mine = calcProject(b.project, b.call, b.actions!, b.costs);
    const theirs = proto.calc(p);
    const pairs: [number, number][] = [
      [mine.equipment, theirs.E],
      [mine.thirdPartyLabor, theirs.MOT],
      [mine.mop, theirs.MOP],
      [mine.admp, theirs.ADMP],
      [mine.peeTotal, theirs.PEE],
      [mine.total, theirs.TOT],
      [mine.annualBenefit, theirs.B],
      [mine.energySavedMwh, theirs.EE],
      [mine.peakReductionKw, theirs.RDP],
      [mine.rcbPee, theirs.rcbP],
      [mine.rcbTotal, theirs.rcbT],
      [mine.rcbMax!, theirs.rmax],
    ];
    for (const [a, t] of pairs) expect(a).toBeCloseTo(t, 6);
    expect(
      mine.checks.map((c) => [c.name, c.ref, c.ok, c.description, Math.round(c.max * 100)]),
    ).toEqual(
      theirs.checks.map((c: { nome: string; ref: string; ok: boolean; desc: string; max: number }) => [
        c.nome,
        c.ref,
        c.ok,
        c.desc,
        Math.round(c.max * 100),
      ]),
    );
  });

  it("document checklist and validity", () => {
    const mine = documentRows(b.project, b.call, b.units, b.documents, TODAY);
    const theirs = proto.docRows(p, proto.S.editais[p.editalId]);
    const kinds: Record<string, string> = {
      ok: "ok",
      falta: "missing",
      vencido: "expired",
      semdata: "no_date",
      opc: "optional",
      na: "na",
    };
    expect(mine.map((r) => [r.item.id, r.unit?.number ?? null, r.status.kind, r.status.label])).toEqual(
      theirs.map((r: { it: { id: string }; uc: { numero: string } | null; st: { k: string; t: string } }) => [
        r.it.id,
        r.uc ? r.uc.numero : null,
        kinds[r.st.k],
        r.st.t,
      ]),
    );
    const s = summarizeDocuments(mine);
    const t = proto.docSummary(p);
    expect([s.total, s.ok, s.expired, s.noDate, s.missing]).toEqual([t.total, t.ok, t.bad, t.warn, t.falta]);
  });

  it("issues and next step", () => {
    const mine = projectIssues(b, all, TODAY);
    const theirs = proto.projIssues(p);
    const areas: Record<string, string> = { docs: "docs", rcb: "rcb", valid: "conflicts" };
    expect(mine.map((i) => [i.tone, i.text, i.area])).toEqual(
      theirs.map((i: { c: string; t: string; v: string }) => [i.c, i.t, areas[i.v]]),
    );
    expect(nextStep(b, all, TODAY).text).toBe(proto.nextStep(p).t);
  });
});
