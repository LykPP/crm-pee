import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  calcProject,
  daysBetween,
  documentStatus,
  projectIssues,
  todayInBrazil,
} from "@/lib/pee";
import type { ChecklistItem } from "@/lib/calls/rules-schema";
import type { Call, ProjectDocument } from "@/lib/pee";
import { exampleBundles, prototypeBundles } from "./fixtures";

describe("reference values from CLAUDE.md (prototype, before the audit)", () => {
  const b = prototypeBundles();
  it.each([
    ["p1", 730107, 0.534],
    ["p2", 2704718, 0.432],
    ["p3", 636333, 0.663],
  ])("%s gives PEE ≈ %d and RCB ≈ %d", (id, pee, rcb) => {
    const x = b[id];
    const k = calcProject(x.project, x.call, x.actions!, x.costs);
    expect(Math.round(k.peeTotal)).toBe(pee);
    expect(k.rcbPee.toFixed(3)).toBe(rcb.toFixed(3));
    expect(k.checks.every((c) => c.ok)).toBe(true);
  });
});

describe("dates", () => {
  it("shifts months with calendar overflow like the prototype", () => {
    expect(addMonths("2026-11-06", -3)).toBe("2026-08-06");
    expect(addMonths("2026-05-31", -3)).toBe("2026-03-03");
    expect(addMonths("2026-01-15", -3)).toBe("2025-10-15");
  });
  it("shifts and counts days", () => {
    expect(addDays("2026-11-06", -30)).toBe("2026-10-07");
    expect(daysBetween("2026-10-22", "2026-11-06")).toBe(15);
    expect(daysBetween("2026-11-06", "2026-10-22")).toBe(-15);
  });
  it("uses the Brazilian date near midnight UTC", () => {
    expect(todayInBrazil(new Date("2026-10-23T02:00:00Z"))).toBe("2026-10-22");
  });
});

describe("document validity", () => {
  const call: Call = { id: "c", published_on: "2026-10-14", submission_deadline: "2026-11-06", rules: {} };
  const item = (validity: ChecklistItem["validity"]): ChecklistItem => ({
    id: "x",
    group: "g",
    name: "n",
    appliesTo: "all",
    scope: "proposal",
    validity,
  });
  const doc = (d: Partial<ProjectDocument>): ProjectDocument => ({
    item_key: "x",
    consumer_unit_id: null,
    status: "ok",
    issued_on: null,
    valid_until: null,
    ...d,
  });
  const kind = (v: ChecklistItem["validity"], d: Partial<ProjectDocument>) =>
    documentStatus(item(v), doc(d), call, "2026-10-22");

  it("certificate must be valid on the deadline", () => {
    expect(kind("certificate", { valid_until: "2026-11-05" }).kind).toBe("expired");
    expect(kind("certificate", { valid_until: "2026-11-06" })).toMatchObject({ kind: "ok", tone: "warn" });
    expect(kind("certificate", { valid_until: "2026-11-21" })).toMatchObject({ kind: "ok", tone: "ok" });
    expect(kind("certificate", {}).kind).toBe("no_date");
  });
  it("bill up to 3 months before the deadline", () => {
    expect(kind("bill_3_months", { issued_on: "2026-08-06" }).kind).toBe("ok");
    expect(kind("bill_3_months", { issued_on: "2026-08-05" }).kind).toBe("expired");
  });
  it("quote up to 3 months before the publication", () => {
    expect(kind("quote_3_months", { issued_on: "2026-07-14" }).kind).toBe("ok");
    expect(kind("quote_3_months", { issued_on: "2026-07-13" }).kind).toBe("expired");
  });
  it("property certificate up to 30 days before the deadline", () => {
    expect(kind("property_30_days", { issued_on: "2026-10-07" }).kind).toBe("ok");
    expect(kind("property_30_days", { issued_on: "2026-10-06" }).kind).toBe("expired");
  });
  it("missing, optional and not applicable", () => {
    expect(documentStatus(item(undefined), null, call, "2026-10-22").kind).toBe("missing");
    expect(documentStatus({ ...item(undefined), optional: true }, null, call, "2026-10-22").kind).toBe("optional");
    expect(kind(undefined, { status: "na" }).kind).toBe("na");
  });
});

describe("conflicts between proposals", () => {
  it("flags the same consumer unit in two proposals of the same call", () => {
    const b = exampleBundles();
    const copy = structuredClone(b.p1);
    copy.project.id = "copy";
    copy.project.name = "Cópia";
    const issues = projectIssues(b.p1, [b.p1, copy], "2026-10-22");
    expect(issues).toContainEqual({ tone: "bad", text: 'UC 3001234567 também está em "Cópia"', area: "conflicts" });
  });

  it("ignores lost proposals and other calls", () => {
    const b = exampleBundles();
    const lost = structuredClone(b.p1);
    lost.project.id = "lost";
    lost.project.stage = "lost";
    const other = structuredClone(b.p1);
    other.project.id = "other";
    other.project.call_id = "another-call";
    const issues = projectIssues(b.p1, [lost, other], "2026-10-22");
    expect(issues.filter((i) => i.area === "conflicts")).toEqual([]);
  });

  it("flags two public lighting projects in the same municipality", () => {
    const b = exampleBundles();
    const second = structuredClone(b.p2);
    second.project.id = "ip2";
    second.units = [{ id: "u", number: "999" }];
    const issues = projectIssues(b.p2, [second], "2026-10-22");
    expect(issues).toContainEqual({
      tone: "bad",
      text: "Outro projeto de IP no mesmo município",
      area: "conflicts",
    });
  });
});

describe("limits and RCB", () => {
  it("flags a rubric above its limit and an RCB above the maximum", () => {
    const b = exampleBundles();
    const x = structuredClone(b.p1);
    x.costs = { ...x.costs!, diagnosis: 90000 };
    x.actions = x.actions!.map((a) => ({ ...a, unit_cost: a.unit_cost * 3 }));
    const texts = projectIssues(x, [], "2026-10-22").map((i) => i.text);
    expect(texts).toContain("Diagnóstico energético acima do limite (ET 5.4.1.1)");
    expect(texts.some((t) => /^RCB .* acima do limite 0,75$/.test(t))).toBe(true);
  });

  it("warns about an end use above the limit while the total passes", () => {
    const issues = projectIssues(exampleBundles().p1, [], "2026-10-22");
    expect(issues).toContainEqual({
      tone: "warn",
      text: "RCB de Climatização 0,94 acima do limite 0,75",
      area: "rcb",
      code: "end_use_rcb",
    });
  });

  it("uses the incentivized limit when there are only incentivized sources and storage", () => {
    const x = structuredClone(exampleBundles().p1);
    x.actions = x.actions!.map((a, i) => ({ ...a, end_use: i ? "Armazenamento (SAE)" : "Fonte incentivada (FV)" }));
    expect(calcProject(x.project, x.call, x.actions, x.costs).rcbMax).toBe(0.9);
  });

  it("skips cost checks when the viewer cannot see costs", () => {
    const b = exampleBundles();
    const x = { ...structuredClone(b.p1), actions: undefined, costs: undefined };
    expect(projectIssues(x, [], "2026-10-22").every((i) => i.area !== "rcb")).toBe(true);
  });
});
