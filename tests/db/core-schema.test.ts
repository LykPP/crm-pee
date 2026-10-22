import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addMember, asUser, createOrgAs, createTestDb, createUser } from "./harness";

const ADMIN_A = "00000000-0000-0000-0000-0000000000a1";
const TECH_A = "00000000-0000-0000-0000-0000000000a2";
const SALES_A = "00000000-0000-0000-0000-0000000000a3";
const VIEWER_A = "00000000-0000-0000-0000-0000000000a4";
const ADMIN_B = "00000000-0000-0000-0000-0000000000b1";

let db: PGlite;
let orgA: string;
let orgB: string;
let globalUtility: string;
let globalCall: string;

async function one<T>(user: string, sql: string, params: unknown[] = []) {
  const res = await asUser(db, user, (tx) => tx.query<T>(sql, params));
  return res.rows[0];
}

async function rows<T>(user: string, sql: string, params: unknown[] = []) {
  return (await asUser(db, user, (tx) => tx.query<T>(sql, params))).rows;
}

async function newClient(user: string, org: string, name = "Hospital") {
  return (
    await one<{ id: string }>(
      user,
      "insert into clients (org_id, name, utility_id) values ($1, $2, $3) returning id",
      [org, name, globalUtility],
    )
  ).id;
}

async function newProject(user: string, org: string, client: string) {
  return (
    await one<{ id: string }>(
      user,
      "insert into projects (org_id, client_id, call_id, name) values ($1, $2, $3, 'Projeto') returning id",
      [org, client, globalCall],
    )
  ).id;
}

beforeEach(async () => {
  db = await createTestDb();
  for (const [id, email] of [
    [ADMIN_A, "admin@a.com"],
    [TECH_A, "tec@a.com"],
    [SALES_A, "com@a.com"],
    [VIEWER_A, "leitor@a.com"],
    [ADMIN_B, "admin@b.com"],
  ]) {
    await createUser(db, id, email);
  }
  orgA = await createOrgAs(db, ADMIN_A, "ESCO A");
  orgB = await createOrgAs(db, ADMIN_B, "ESCO B");
  await addMember(db, orgA, TECH_A, "technician");
  await addMember(db, orgA, SALES_A, "sales");
  await addMember(db, orgA, VIEWER_A, "viewer");

  // Global reference data is written with the service role (superuser here).
  globalUtility = (
    await db.query<{ id: string }>(
      "insert into utilities (slug, name, short_name) values ('cemig', 'Cemig Distribuição', 'Cemig D') returning id",
    )
  ).rows[0].id;
  globalCall = (
    await db.query<{ id: string }>(
      "insert into calls (slug, utility_id, code, name, status) values ('cemig-2026', $1, 'CPP 001/2026', 'Chamada Cemig', 'open') returning id",
      [globalUtility],
    )
  ).rows[0].id;
});

describe("global reference data", () => {
  it("is visible to every organization", async () => {
    for (const user of [ADMIN_A, VIEWER_A, ADMIN_B]) {
      expect(await rows(user, "select id from calls")).toHaveLength(1);
      expect(await rows(user, "select id from utilities")).toHaveLength(1);
    }
  });

  it("cannot be created or changed by users", async () => {
    await expect(
      one(ADMIN_A, "insert into utilities (name, short_name) values ('X', 'X')"),
    ).rejects.toThrow(/row-level security/);
    const res = await asUser(db, ADMIN_A, (tx) =>
      tx.query("update calls set name = 'Alterado' where id = $1", [globalCall]),
    );
    expect(res.affectedRows).toBe(0);
  });

  it("organizations keep their own calls private", async () => {
    await one(
      ADMIN_A,
      "insert into calls (org_id, utility_id, code, name) values ($1, $2, 'Cópia', 'Cópia da ESCO A')",
      [orgA, globalUtility],
    );
    expect(await rows(ADMIN_A, "select id from calls")).toHaveLength(2);
    expect(await rows(ADMIN_B, "select id from calls")).toHaveLength(1);
  });
});

describe("tenant isolation", () => {
  it("hides every table's rows from other organizations", async () => {
    const client = await newClient(ADMIN_A, orgA);
    const project = await newProject(ADMIN_A, orgA, client);
    const unit = (
      await one<{ id: string }>(
        ADMIN_A,
        "insert into consumer_units (org_id, project_id, number) values ($1, $2, '3001') returning id",
        [orgA, project],
      )
    ).id;
    await one(
      ADMIN_A,
      "insert into contacts (org_id, client_id, name) values ($1, $2, 'Mariana')",
      [orgA, client],
    );
    await one(
      ADMIN_A,
      "insert into project_documents (org_id, project_id, item_key, consumer_unit_id, status) values ($1, $2, 'fatura', $3, 'ok')",
      [orgA, project, unit],
    );
    await one(
      ADMIN_A,
      "insert into efficiency_actions (org_id, project_id, end_use) values ($1, $2, 'Iluminação')",
      [orgA, project],
    );
    await one(ADMIN_A, "insert into project_costs (org_id, project_id) values ($1, $2)", [
      orgA,
      project,
    ]);
    await one(
      ADMIN_A,
      "insert into execution_steps (org_id, project_id, step_key) values ($1, $2, 'diag')",
      [orgA, project],
    );
    await one(
      ADMIN_A,
      "insert into interactions (org_id, kind, summary, client_id) values ($1, 'visit', 'Visita', $2)",
      [orgA, client],
    );

    const tables = [
      "clients",
      "contacts",
      "projects",
      "consumer_units",
      "project_documents",
      "efficiency_actions",
      "project_costs",
      "execution_steps",
      "interactions",
      "audit_log",
    ];
    for (const table of tables) {
      expect(await rows(ADMIN_A, `select 1 from ${table}`), table).not.toHaveLength(0);
      expect(await rows(ADMIN_B, `select 1 from ${table}`), table).toHaveLength(0);
    }
  });

  it("cannot write into another organization", async () => {
    await expect(newClient(ADMIN_B, orgA)).rejects.toThrow(/row-level security/);
  });

  it("cannot link a project to another organization's client", async () => {
    const clientA = await newClient(ADMIN_A, orgA);
    await expect(newProject(ADMIN_B, orgB, clientA)).rejects.toThrow(/foreign key/);
  });

  it("cannot use another organization's private call", async () => {
    const privateCall = (
      await one<{ id: string }>(
        ADMIN_A,
        "insert into calls (org_id, utility_id, code, name) values ($1, $2, 'P', 'Privada') returning id",
        [orgA, globalUtility],
      )
    ).id;
    const clientB = await newClient(ADMIN_B, orgB);
    await expect(
      one(
        ADMIN_B,
        "insert into projects (org_id, client_id, call_id, name) values ($1, $2, $3, 'X')",
        [orgB, clientB, privateCall],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot move a row to another organization", async () => {
    const client = await newClient(ADMIN_A, orgA);
    await addMember(db, orgB, ADMIN_A, "viewer");
    await expect(
      one(ADMIN_A, "update clients set org_id = $1 where id = $2", [orgB, client]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("roles", () => {
  let client: string;
  let project: string;

  beforeEach(async () => {
    client = await newClient(ADMIN_A, orgA);
    project = await newProject(ADMIN_A, orgA, client);
    await one(
      ADMIN_A,
      "insert into project_costs (org_id, project_id, diagnosis) values ($1, $2, 35000)",
      [orgA, project],
    );
    await one(
      ADMIN_A,
      "insert into efficiency_actions (org_id, project_id, end_use, unit_cost) values ($1, $2, 'Iluminação', 85)",
      [orgA, project],
    );
  });

  it("technician edits project details and costs", async () => {
    await one(
      TECH_A,
      "insert into consumer_units (org_id, project_id, number) values ($1, $2, '3002')",
      [orgA, project],
    );
    const res = await asUser(db, TECH_A, (tx) =>
      tx.query("update project_costs set diagnosis = 40000 where project_id = $1", [project]),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("sales works with clients, contacts, interactions and pipeline", async () => {
    await newClient(SALES_A, orgA, "Escola");
    await one(
      SALES_A,
      "insert into contacts (org_id, client_id, name) values ($1, $2, 'Rogério')",
      [orgA, client],
    );
    await one(
      SALES_A,
      "insert into interactions (org_id, kind, summary, project_id) values ($1, 'call', 'Ligação', $2)",
      [orgA, project],
    );
    const res = await asUser(db, SALES_A, (tx) =>
      tx.query("update projects set stage = 'site_visit' where id = $1", [project]),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("sales and viewers do not see costs or efficiency actions", async () => {
    for (const user of [SALES_A, VIEWER_A]) {
      expect(await rows(user, "select 1 from project_costs")).toHaveLength(0);
      expect(await rows(user, "select 1 from efficiency_actions")).toHaveLength(0);
      expect(await rows(user, "select 1 from projects")).toHaveLength(1);
    }
  });

  it("sales cannot change project documents", async () => {
    await expect(
      one(
        SALES_A,
        "insert into project_documents (org_id, project_id, item_key) values ($1, $2, 'cnpj')",
        [orgA, project],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("viewer cannot change anything", async () => {
    await expect(newClient(VIEWER_A, orgA)).rejects.toThrow(/row-level security/);
    const res = await asUser(db, VIEWER_A, (tx) =>
      tx.query("update projects set name = 'X' where id = $1", [project]),
    );
    expect(res.affectedRows).toBe(0);
  });

  it("only admins delete clients and projects or read the audit log", async () => {
    const del = await asUser(db, TECH_A, (tx) =>
      tx.query("delete from projects where id = $1", [project]),
    );
    expect(del.affectedRows).toBe(0);
    expect(await rows(TECH_A, "select 1 from audit_log")).toHaveLength(0);
    expect(await rows(ADMIN_A, "select 1 from audit_log")).not.toHaveLength(0);
  });
});

describe("audit log", () => {
  it("records who changed what", async () => {
    const client = await newClient(ADMIN_A, orgA);
    await one(TECH_A, "update clients set status = 'qualified' where id = $1", [client]);
    const log = await rows<{ action: string; changed_by: string; status: string }>(
      ADMIN_A,
      "select action, changed_by, new_data ->> 'status' as status from audit_log where record_id = $1 order by id",
      [client],
    );
    expect(log).toEqual([
      { action: "insert", changed_by: ADMIN_A, status: "lead" },
      { action: "update", changed_by: TECH_A, status: "qualified" },
    ]);
  });
});

describe("project documents", () => {
  it("keeps one record per checklist item and consumer unit", async () => {
    const client = await newClient(ADMIN_A, orgA);
    const project = await newProject(ADMIN_A, orgA, client);
    const unit = (
      await one<{ id: string }>(
        ADMIN_A,
        "insert into consumer_units (org_id, project_id, number) values ($1, $2, '3001') returning id",
        [orgA, project],
      )
    ).id;
    const insert = (unitId: string | null) =>
      one(
        TECH_A,
        "insert into project_documents (org_id, project_id, item_key, consumer_unit_id) values ($1, $2, 'fatura', $3)",
        [orgA, project, unitId],
      );
    await insert(null);
    await insert(unit);
    await expect(insert(null)).rejects.toThrow(/duplicate key/);
    await expect(insert(unit)).rejects.toThrow(/duplicate key/);
  });
});
