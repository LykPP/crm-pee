import { describe, expect, it } from "vitest";
import { PAGE_SIZE, selectAll } from "./select-all";

describe("selectAll", () => {
  it("keeps reading pages until a short one", async () => {
    const total = PAGE_SIZE * 2 + 5;
    const calls: [number, number][] = [];
    const rows = await selectAll("rows", async (from, to) => {
      calls.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
      return { data, error: null };
    });
    expect(rows).toHaveLength(total);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("reports errors", async () => {
    await expect(selectAll("rows", async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow(
      "Could not load rows: boom",
    );
  });
});
