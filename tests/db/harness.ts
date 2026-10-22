import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = join(__dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

/** In-memory Postgres with the Supabase shim and every migration applied. */
export async function createTestDb() {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, "supabase-shim.sql"), "utf8"));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  return db;
}

export async function createUser(db: PGlite, id: string, email: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Runs queries as a signed-in user, the way Supabase does for API requests. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: PGlite) => Promise<T>) {
  await db.exec("begin");
  try {
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const result = await fn(db);
    await db.exec("commit");
    return result;
  } catch (err) {
    await db.exec("rollback");
    throw err;
  }
}

/** Adds a person to an organization directly, bypassing permissions. */
export async function addMember(db: PGlite, orgId: string, userId: string, role: string) {
  await db.query("insert into memberships (org_id, user_id, role) values ($1, $2, $3)", [
    orgId,
    userId,
    role,
  ]);
}

/** Creates an organization through the public function, as that user. */
export async function createOrgAs(db: PGlite, userId: string, name: string) {
  const res = await asUser(db, userId, (tx) =>
    tx.query<{ id: string }>("select public.create_organization($1) as id", [name]),
  );
  return res.rows[0].id;
}
