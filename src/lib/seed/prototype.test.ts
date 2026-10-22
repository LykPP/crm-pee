import { describe, expect, it } from "vitest";
import { seedCalls, seedClients, seedInteractions, seedProjects } from "./data";
import {
  convertCall,
  convertClient,
  convertDocument,
  convertInteraction,
  convertProject,
} from "./prototype";

describe("prototype seed conversion", () => {
  it("converts the Cemig call rules into a valid rules document", () => {
    const call = convertCall(seedCalls["cemig-cpp-001-2026"]);
    expect(call.status).toBe("open");
    expect(call.rules.checklist).toHaveLength(27);
    expect(call.rules.typologies).toHaveLength(7);
    expect(call.rules.maxBcr).toEqual({ fp: 0.75, cd: 0.85, incentivizedOnly: 0.9 });
    expect(call.rules.limits?.diagnosis).toEqual({ pct: 0.075, cap: 58000 });
    expect(call.rules.mop).toEqual({ fixed: 29535.52, pct: 0.05 });
  });

  it("converts calls without rules", () => {
    expect(convertCall(seedCalls["enel-rio-cpp-001-2026"]).rules).toEqual({});
  });

  it("converts every client, project and interaction", () => {
    for (const c of Object.values(seedClients)) expect(convertClient(c).is_example).toBe(true);
    for (const p of Object.values(seedProjects)) expect(convertProject(p).is_example).toBe(true);
    for (const i of Object.values(seedInteractions)) expect(convertInteraction(i).kind).toBeTruthy();
  });

  it("splits per consumer unit document keys", () => {
    const doc = convertDocument("fatura__u2", { status: "ok", emissao: "2026-07-15" });
    expect(doc).toMatchObject({ itemKey: "fatura", unitId: "u2" });
    expect(doc.row).toMatchObject({ status: "ok", issued_on: "2026-07-15" });
    expect(convertDocument("cnpj", {}).row.status).toBe("pending");
  });

  it("maps the project flags", () => {
    expect(convertProject(seedProjects.p2)).toMatchObject({
      requires_public_bidding: true,
      stage: "diagnosis",
      voltage_level: "B4",
    });
  });
});
