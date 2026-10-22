import { describe, expect, it } from "vitest";
import { buildExampleRows, EXAMPLE_TABLES } from "@/lib/seed/examples";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { asUser, createOrgAs, createTestDb, createUser } from "./harness";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const OUTSIDER = "00000000-0000-0000-0000-0000000000b1";
const referenceSql = readFileSync(join(__dirname, "..", "..", "supabase", "seed", "reference_data.sql"), "utf8");

/**
 * Sweeps every table in the public schema, so tables added later are
 * covered without editing this test.
 */
describe("tenant isolation sweep", () => {
  it("has row level security on every table and hides one organization's rows from another", async () => {
    const db = await createTestDb();
    await db.exec(referenceSql);
    await createUser(db, ADMIN, "admin@a.com");
    await createUser(db, OUTSIDER, "admin@b.com");
    const org = await createOrgAs(db, ADMIN, "ESCO A");
    await createOrgAs(db, OUTSIDER, "ESCO B");

    const ids = async (table: string) =>
      Object.fromEntries(
        (await db.query<{ slug: string; id: string }>(`select slug, id from ${table} where org_id is null`)).rows.map(
          (r) => [r.slug, r.id],
        ),
      );
    const rows = buildExampleRows(org, await ids("utilities"), await ids("calls"));
    await asUser(db, ADMIN, async (tx) => {
      for (const table of EXAMPLE_TABLES) {
        for (const row of rows[table]) {
          const cols = Object.keys(row);
          await tx.query(
            `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
            Object.values(row),
          );
        }
      }
      await tx.query(
        "insert into execution_steps (org_id, project_id, step_key) select $1, id, 'diag' from projects limit 1",
        [org],
      );
      await tx.query("insert into invitations (org_id, email, role) values ($1, 'x@a.com', 'viewer')", [org]);
      await tx.query("insert into utilities (org_id, name, short_name) values ($1, 'Própria', 'P')", [org]);
      await tx.query("insert into calls (org_id, utility_id, code, name) select $1, utility_id, 'Cópia', 'Cópia' from calls limit 1", [org]);
    });

    const tables = (
      await db.query<{ name: string; rls: boolean; has_org: boolean }>(`
        select c.relname as name, c.relrowsecurity as rls,
               exists (select 1 from information_schema.columns
                       where table_schema = 'public' and table_name = c.relname and column_name = 'org_id') as has_org
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' order by 1`)
    ).rows;
    expect(tables.length).toBeGreaterThanOrEqual(15);
    expect(tables.filter((t) => !t.rls).map((t) => t.name)).toEqual([]);

    for (const t of tables) {
      if (!t.has_org && t.name !== "organizations") continue;
      const column = t.name === "organizations" ? "id" : "org_id";
      const mine = await asUser(db, ADMIN, (tx) => tx.query(`select 1 from ${t.name} where ${column} = $1`, [org]));
      const theirs = await asUser(db, OUTSIDER, (tx) =>
        tx.query(`select 1 from ${t.name} where ${column} = $1`, [org]),
      );
      expect(mine.rows.length, `${t.name} should have rows for this test`).toBeGreaterThan(0);
      expect(theirs.rows, `${t.name} leaked to another organization`).toHaveLength(0);
    }
  });
});
