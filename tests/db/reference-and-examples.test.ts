import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { buildExampleRows, EXAMPLE_TABLES } from "@/lib/seed/examples";
import { asUser, createOrgAs, createTestDb, createUser } from "./harness";

const referenceSql = readFileSync(
  join(__dirname, "..", "..", "supabase", "seed", "reference_data.sql"),
  "utf8",
);
const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const OTHER = "00000000-0000-0000-0000-0000000000b1";

let db: PGlite;

async function idsBySlug(table: string) {
  const res = await db.query<{ slug: string; id: string }>(
    `select slug, id from ${table} where org_id is null`,
  );
  return Object.fromEntries(res.rows.map((r) => [r.slug, r.id]));
}

async function insertRows(user: string, table: string, rows: Record<string, unknown>[]) {
  await asUser(db, user, async (tx) => {
    for (const row of rows) {
      const cols = Object.keys(row);
      const params = cols.map((_, i) => `$${i + 1}`);
      await tx.query(
        `insert into ${table} (${cols.join(", ")}) values (${params.join(", ")})`,
        Object.values(row).map((v) => (v && typeof v === "object" ? JSON.stringify(v) : v)),
      );
    }
  });
}

beforeEach(async () => {
  db = await createTestDb();
  await db.exec(referenceSql);
});

describe("reference data", () => {
  it("loads the utilities and calls as global rows", async () => {
    expect(Object.keys(await idsBySlug("utilities")).sort()).toEqual([
      "cemig",
      "enel-rio",
      "energisa-mr",
      "light",
    ]);
    const cemig = await db.query<{ status: string; items: number }>(
      "select status, jsonb_array_length(rules -> 'checklist') as items from calls where slug = 'cemig-cpp-001-2026'",
    );
    expect(cemig.rows[0]).toEqual({ status: "open", items: 27 });
  });

  it("can be loaded again without duplicating rows", async () => {
    await db.exec(referenceSql);
    const res = await db.query<{ n: number }>("select count(*)::int as n from calls");
    expect(res.rows[0].n).toBe(3);
  });
});

describe("example data", () => {
  it("loads into one organization through the normal permissions", async () => {
    await createUser(db, ADMIN, "admin@a.com");
    await createUser(db, OTHER, "admin@b.com");
    const org = await createOrgAs(db, ADMIN, "ESCO A");
    await createOrgAs(db, OTHER, "ESCO B");

    const rows = buildExampleRows(org, await idsBySlug("utilities"), await idsBySlug("calls"));
    for (const table of EXAMPLE_TABLES) await insertRows(ADMIN, table, rows[table]);

    const count = async (user: string, table: string) =>
      (
        await asUser(db, user, (tx) =>
          tx.query<{ n: number }>(`select count(*)::int as n from ${table}`),
        )
      ).rows[0].n;

    expect(await count(ADMIN, "clients")).toBe(6);
    expect(await count(ADMIN, "projects")).toBe(4);
    expect(await count(ADMIN, "interactions")).toBe(6);
    expect(await count(ADMIN, "efficiency_actions")).toBeGreaterThan(0);
    expect(await count(OTHER, "clients")).toBe(0);
    expect(await count(OTHER, "projects")).toBe(0);

    const unitDocs = await asUser(db, ADMIN, (tx) =>
      tx.query("select 1 from project_documents where consumer_unit_id is not null"),
    );
    expect(unitDocs.rows.length).toBeGreaterThan(0);
  });
});
