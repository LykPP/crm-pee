import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addMember, asUser, createOrgAs, createTestDb, createUser } from "./harness";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const TECH = "00000000-0000-0000-0000-0000000000a2";
const NEWCOMER = "00000000-0000-0000-0000-0000000000a3";
const OTHER_ADMIN = "00000000-0000-0000-0000-0000000000b1";

let db: PGlite;
let org: string;

const run = <T>(user: string, sql: string, params: unknown[] = []) =>
  asUser(db, user, (tx) => tx.query<T>(sql, params)).then((r) => r.rows);

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN, "admin@esco.com");
  await createUser(db, TECH, "tec@esco.com");
  await createUser(db, NEWCOMER, "Nova@Esco.com");
  await createUser(db, OTHER_ADMIN, "admin@outra.com");
  org = await createOrgAs(db, ADMIN, "ESCO");
  await createOrgAs(db, OTHER_ADMIN, "Outra");
  await addMember(db, org, TECH, "technician");
});

describe("invitations", () => {
  it("lets an invited person join with the chosen role on first sign-in", async () => {
    await run(ADMIN, "insert into invitations (org_id, email, role) values ($1, 'nova@esco.com', 'sales')", [org]);
    const [{ joined }] = await run<{ joined: number }>(NEWCOMER, "select public.accept_invitations() as joined");
    expect(joined).toBe(1);
    const members = await run<{ email: string; role: string }>(NEWCOMER, "select email, role from public.list_members($1)", [org]);
    expect(members).toContainEqual({ email: "Nova@Esco.com", role: "sales" });
    expect(await run(NEWCOMER, "select public.accept_invitations() as joined")).toEqual([{ joined: 0 }]);
  });

  it("is managed by admins only and stays private to the organization", async () => {
    await expect(
      run(TECH, "insert into invitations (org_id, email, role) values ($1, 'x@y.com', 'admin')", [org]),
    ).rejects.toThrow(/row-level security/);
    await run(ADMIN, "insert into invitations (org_id, email, role) values ($1, 'x@y.com', 'viewer')", [org]);
    expect(await run(OTHER_ADMIN, "select 1 from invitations")).toHaveLength(0);
    expect(await run(TECH, "select 1 from invitations")).toHaveLength(0);
    expect(await run(ADMIN, "select 1 from invitations")).toHaveLength(1);
  });

  it("does not let someone invite into another organization", async () => {
    await expect(
      run(OTHER_ADMIN, "insert into invitations (org_id, email, role) values ($1, 'x@y.com', 'admin')", [org]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("members", () => {
  it("lists e-mails only to members of the organization", async () => {
    expect(await run(TECH, "select email from public.list_members($1)", [org])).toHaveLength(2);
    expect(await run(OTHER_ADMIN, "select email from public.list_members($1)", [org])).toHaveLength(0);
  });

  it("lets admins change roles and remove people", async () => {
    await run(ADMIN, "select public.set_member_role($1, $2, 'viewer')", [org, TECH]);
    expect(await run(ADMIN, "select role from memberships where user_id = $1", [TECH])).toEqual([{ role: "viewer" }]);
    await run(ADMIN, "select public.remove_member($1, $2)", [org, TECH]);
    expect(await run(ADMIN, "select 1 from memberships where user_id = $1", [TECH])).toHaveLength(0);
  });

  it("refuses team changes from non-admins", async () => {
    await expect(run(TECH, "select public.set_member_role($1, $2, 'admin')", [org, TECH])).rejects.toThrow(/only admins/);
    await expect(run(OTHER_ADMIN, "select public.remove_member($1, $2)", [org, TECH])).rejects.toThrow(/only admins/);
  });

  it("always keeps an admin", async () => {
    await expect(run(ADMIN, "select public.set_member_role($1, $2, 'technician')", [org, ADMIN])).rejects.toThrow(/keep an admin/);
    await expect(run(ADMIN, "select public.remove_member($1, $2)", [org, ADMIN])).rejects.toThrow(/keep an admin/);
    await run(ADMIN, "select public.set_member_role($1, $2, 'admin')", [org, TECH]);
    await run(ADMIN, "select public.remove_member($1, $2)", [org, ADMIN]);
    expect(await run(TECH, "select role from memberships")).toEqual([{ role: "admin" }]);
  });

  it("cannot be changed directly in the table", async () => {
    await expect(run(ADMIN, "update memberships set role = 'viewer' where user_id = $1", [TECH])).rejects.toThrow(/permission denied/);
    await expect(run(ADMIN, "delete from memberships where user_id = $1", [TECH])).rejects.toThrow(/permission denied/);
  });
});

