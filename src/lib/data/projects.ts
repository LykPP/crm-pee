/** Loads projects with everything the business rules need. */
import { callRulesSchema } from "@/lib/calls/rules-schema";
import type {
  Call,
  ConsumerUnit,
  EfficiencyAction,
  ExecutionStep,
  Project,
  ProjectBundle,
  ProjectCosts,
  ProjectDocument,
} from "@/lib/pee";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { selectAll } from "./select-all";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const CAN_SEE_COSTS: MemberRole[] = ["admin", "technician"];

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return res.data as T;
}

export async function loadProjectBundles(supabase: Supabase, role: MemberRole): Promise<ProjectBundle[]> {
  const seeCosts = CAN_SEE_COSTS.includes(role);
  const [projectRows, unitRows, docRows, actionRows, costRows] = await Promise.all([
    selectAll<Project>("projects", (a, b) => supabase.from("projects").select("*").order("created_at").order("id").range(a, b)),
    selectAll<ConsumerUnit & { project_id: string }>("consumer units", (a, b) =>
      supabase.from("consumer_units").select("*").order("position").order("id").range(a, b),
    ),
    selectAll<ProjectDocument & { project_id: string }>("documents", (a, b) =>
      supabase.from("project_documents").select("*").order("id").range(a, b),
    ),
    seeCosts
      ? selectAll<EfficiencyAction & { project_id: string }>("actions", (a, b) =>
          supabase.from("efficiency_actions").select("*").order("position").order("id").range(a, b),
        )
      : null,
    seeCosts
      ? selectAll<ProjectCosts & { project_id: string }>("costs", (a, b) =>
          supabase.from("project_costs").select("*").order("id").range(a, b),
        )
      : null,
  ]);

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

export async function listExecutionSteps(supabase: Supabase, projectId: string) {
  const rows = must(
    await supabase
      .from("execution_steps")
      .select("step_key, status, started_on, finished_on")
      .eq("project_id", projectId),
    "execution steps",
  );
  return rows as ExecutionStep[];
}

export async function listAllExecutionSteps(supabase: Supabase) {
  return selectAll<ExecutionStep & { project_id: string }>("execution steps", (a, b) =>
    supabase
      .from("execution_steps")
      .select("project_id, step_key, status, started_on, finished_on")
      .order("id")
      .range(a, b),
  );
}
