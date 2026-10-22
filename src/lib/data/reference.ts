/** Utilities (distribuidoras) and calls (editais) visible to the organization. */
import { callRulesSchema, type CallRules } from "@/lib/calls/rules-schema";
import type { CallStatus, InteractionKind } from "@/lib/labels";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface UtilityRow {
  id: string;
  org_id: string | null;
  name: string;
  short_name: string;
  state: string | null;
  concession_area: string | null;
  website: string | null;
  pee_email: string | null;
  submission_url: string | null;
  address: string | null;
  notes: string | null;
}

export interface CallRow {
  id: string;
  org_id: string | null;
  utility_id: string;
  source_call_id: string | null;
  code: string;
  name: string;
  status: CallStatus;
  published_on: string | null;
  submission_deadline: string | null;
  deadline_note: string | null;
  total_budget: number | null;
  call_url: string | null;
  submission_url: string | null;
  clarification_email: string | null;
  clarification_subject: string | null;
  notes: string | null;
  rules: CallRules;
  /** False when the stored rules failed validation and were ignored. */
  rulesValid: boolean;
  utility: { name: string; short_name: string; pee_email: string | null } | null;
}

export interface ContactRow {
  id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

export interface InteractionRow {
  id: string;
  kind: InteractionKind;
  occurred_on: string;
  summary: string;
  author_name: string | null;
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return res.data as T;
}

/** Calls are shown with the utility's short name; drop it from codes that repeat it. */
export function shortCallCode(call: Pick<CallRow, "code" | "utility">) {
  const suffix = call.utility?.short_name;
  return suffix && call.code.endsWith(` ${suffix}`) ? call.code.slice(0, -suffix.length - 1) : call.code;
}

/** Open calls first, then by submission deadline. */
export function sortCalls<T extends Pick<CallRow, "status" | "submission_deadline">>(calls: T[]) {
  return [...calls].sort(
    (a, b) =>
      Number(b.status === "open") - Number(a.status === "open") ||
      (a.submission_deadline ?? "9").localeCompare(b.submission_deadline ?? "9"),
  );
}

const CALL_COLUMNS = "*, utility:utilities(name, short_name, pee_email)";

function toCall(row: Record<string, unknown>): CallRow {
  const parsed = callRulesSchema.safeParse(row.rules ?? {});
  if (!parsed.success) console.error(`Call ${row.id} has invalid rules`, parsed.error.issues);
  return {
    ...(row as unknown as CallRow),
    total_budget: row.total_budget == null ? null : Number(row.total_budget),
    rules: parsed.success ? parsed.data : {},
    rulesValid: parsed.success,
  };
}

export async function listCalls(supabase: Supabase) {
  const rows = must(await supabase.from("calls").select(CALL_COLUMNS), "calls");
  return sortCalls((rows as Record<string, unknown>[]).map(toCall));
}

export async function getCall(supabase: Supabase, id: string) {
  const row = must(await supabase.from("calls").select(CALL_COLUMNS).eq("id", id).maybeSingle(), "call");
  return row ? toCall(row as Record<string, unknown>) : null;
}

export async function listUtilities(supabase: Supabase) {
  const rows = must(await supabase.from("utilities").select("*").order("name"), "utilities");
  return (rows as UtilityRow[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getUtility(supabase: Supabase, id: string) {
  const row = must(await supabase.from("utilities").select("*").eq("id", id).maybeSingle(), "utility");
  return row as UtilityRow | null;
}

export async function listUtilityContacts(supabase: Supabase, utilityId: string) {
  const rows = must(
    await supabase
      .from("contacts")
      .select("id, name, job_title, email, phone, is_primary")
      .eq("utility_id", utilityId)
      .order("is_primary", { ascending: false })
      .order("name"),
    "contacts",
  );
  return rows as ContactRow[];
}

export async function listInteractions(
  supabase: Supabase,
  filter: { column: "utility_id" | "client_id" | "project_id"; id: string },
) {
  const rows = must(
    await supabase
      .from("interactions")
      .select("id, kind, occurred_on, summary, author_name")
      .eq(filter.column, filter.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    "interactions",
  );
  return rows as InteractionRow[];
}

/** Projects of the organization in a call, for counts per typology. */
export async function listCallProjects(supabase: Supabase, callId: string) {
  const rows = must(
    await supabase.from("projects").select("id, typology, stage").eq("call_id", callId).neq("stage", "lost"),
    "projects",
  );
  return rows as { id: string; typology: string | null; stage: string }[];
}
