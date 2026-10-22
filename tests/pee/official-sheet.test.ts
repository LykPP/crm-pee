import { describe, expect, it } from "vitest";
import { calcProject } from "@/lib/pee";
import { exampleBundles } from "./fixtures";

/**
 * Results of Cemig's official RCB workbook (docs/editais/Planilha-RCB-CPP-2026-rev01.xlsx)
 * for the example projects, produced by scripts/check-official-rcb.py.
 */
const OFFICIAL = {
  p1: {
    pee: 731606.572631579,
    rcb: 0.5346769307193742,
    uses: { Iluminação: 0.20914753954914206, Climatização: 0.941566574837535 },
  },
  p2: { pee: 2706218.41473684, rcb: 0.43251926866452256, uses: { Iluminação: 0.43251926866452256 } },
  p3: {
    pee: 637832.888421053,
    rcb: 0.6645605196833926,
    uses: { Iluminação: 0.35486549439438203, Climatização: 1.9477754311214999 },
  },
};

describe.each(Object.keys(OFFICIAL) as (keyof typeof OFFICIAL)[])("%s matches Cemig's workbook", (id) => {
  it("PEE budget, RCB and RCB per end use", () => {
    const b = exampleBundles()[id];
    const k = calcProject(b.project, b.call, b.actions!, b.costs);
    const ref = OFFICIAL[id];
    expect(k.audit).toBe(1500);
    expect(k.peeTotal).toBeCloseTo(ref.pee, 4);
    expect(k.rcbPee).toBeCloseTo(ref.rcb, 9);
    expect(Object.fromEntries(k.byEndUse.map((u) => [u.endUse, u.rcb]))).toEqual(
      Object.fromEntries(Object.entries(ref.uses).map(([u, v]) => [u, expect.closeTo(v, 9)])),
    );
  });
});
