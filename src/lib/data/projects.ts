/** Loads projects with everything the business rules need. */
import { callRulesSchema } from "@/lib/calls/rules-schema";
import type {
  Call,
  ConsumerUnit,
  EfficiencyAction,
  Project,
  ProjectBundle,
  ProjectCosts,
  ProjectDocument,
} from "@/lib/pee";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const CAN_SEE_COSTS: MemberRole[] = ["admin", "technician"];

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return res.data as T;
}

export async function loadProjectBundles(supabase: Supabase, role: MemberRole): Promise<ProjectBundle[]> {
  const seeCosts = CAN_SEE_COSTS.includes(role);
  const [projects, units, documents, actions, costs] = await Promise.all([
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("consumer_units").select("*").order("position"),
    supabase.from("project_documents").select("*"),
    seeCosts ? supabase.from("efficiency_actions").select("*").order("position") : null,
    seeCosts ? supabase.from("project_costs").select("*") : null,
  ]);

  const projectRows = must(projects, "projects") as Project[];
  const callIds = [...new Set(projectRows.map((p) => p.call_id).filter((id): id is string => !!id))];
  const callRows = callIds.length
    ? must(
        await supabase.from("calls").select("id, published_on, submission_deadline, rules").in("id", callIds),
        "calls",
      )
    : [];

  const calls = new Map<string, Call>();
  for (const c of callRows as { id: string; published_on: string | null; submission_deadline: string | null; rules: unknown }[]) {
    const parsed = callRulesSchema.safeParse(c.rules);
    if (!parsed.success) console.error(`Call ${c.id} has invalid rules`, parsed.error.issues);
    calls.set(c.id, { ...c, rules: parsed.success ? parsed.data : {} });
  }

  const unitRows = must(units, "consumer units") as (ConsumerUnit & { project_id: string })[];
  const docRows = must(documents, "documents") as (ProjectDocument & { project_id: string })[];
  const actionRows = actions ? (must(actions, "actions") as (EfficiencyAction & { project_id: string })[]) : null;
  const costRows = costs ? (must(costs, "costs") as (ProjectCosts & { project_id: string })[]) : null;

  // Numeric columns may arrive as strings; the rules convert with Number().
  return projectRows.map((project) => ({
    project,
    call: project.call_id ? (calls.get(project.call_id) ?? null) : null,
    units: unitRows.filter((u) => u.project_id === project.id),
    documents: docRows.filter((d) => d.project_id === project.id),
    actions: actionRows?.filter((a) => a.project_id === project.id),
    costs: costRows ? (costRows.find((c) => c.project_id === project.id) ?? null) : undefined,
  }));
}
