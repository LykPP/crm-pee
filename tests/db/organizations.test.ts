import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./harness";

const ANA = "00000000-0000-0000-0000-00000000000a";
const BRUNO = "00000000-0000-0000-0000-00000000000b";

let db: PGlite;

async function createOrg(userId: string, name: string) {
  const res = await asUser(db, userId, (tx) =>
    tx.query<{ id: string }>("select public.create_organization($1) as id", [name]),
  );
  return res.rows[0].id;
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, ANA, "ana@esco-a.com.br");
  await createUser(db, BRUNO, "bruno@esco-b.com.br");
});

describe("create_organization", () => {
  it("creates the organization with the caller as admin", async () => {
    const orgId = await createOrg(ANA, "  ESCO A  ");
    const rows = await asUser(db, ANA, (tx) =>
      tx.query<{ name: string; role: string }>(
        "select o.name, m.role from organizations o join memberships m on m.org_id = o.id",
      ),
    );
    expect(rows.rows).toEqual([{ name: "ESCO A", role: "admin" }]);
    expect(orgId).toBeTruthy();
  });

  it("refuses a second organization for the same person", async () => {
    await createOrg(ANA, "ESCO A");
    await expect(createOrg(ANA, "Outra")).rejects.toThrow(/already belongs/);
  });

  it("refuses anonymous callers", async () => {
    await expect(
      asUser(db, "", (tx) => tx.query("select public.create_organization('X')")),
    ).rejects.toThrow();
  });
});

describe("tenant isolation", () => {
  it("each person sees only their own organization and memberships", async () => {
    await createOrg(ANA, "ESCO A");
    await createOrg(BRUNO, "ESCO B");

    for (const [user, name] of [[ANA, "ESCO A"], [BRUNO, "ESCO B"]] as const) {
      const orgs = await asUser(db, user, (tx) =>
        tx.query<{ name: string }>("select name from organizations"),
      );
      expect(orgs.rows.map((r) => r.name)).toEqual([name]);
      const members = await asUser(db, user, (tx) =>
        tx.query<{ user_id: string }>("select user_id from memberships"),
      );
      expect(members.rows.map((r) => r.user_id)).toEqual([user]);
    }
  });

  it("cannot rename another organization", async () => {
    const orgB = await createOrg(BRUNO, "ESCO B");
    await createOrg(ANA, "ESCO A");
    const res = await asUser(db, ANA, (tx) =>
      tx.query("update organizations set name = 'Invadida' where id = $1", [orgB]),
    );
    expect(res.affectedRows).toBe(0);
  });

  it("cannot add itself to another organization", async () => {
    const orgB = await createOrg(BRUNO, "ESCO B");
    await expect(
      asUser(db, ANA, (tx) =>
        tx.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'admin')", [
          orgB,
          ANA,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
