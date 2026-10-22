/** Loads everything the agenda needs for the signed-in organization. */
import type { AgendaInput } from "@/lib/agenda";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { listClients } from "./clients";
import { listAllExecutionSteps, loadProjectBundles } from "./projects";
import { listCalls, listUtilities } from "./reference";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadAgenda(supabase: Supabase, role: MemberRole) {
  const [projects, clients, calls, steps, utilities] = await Promise.all([
    loadProjectBundles(supabase, role),
    listClients(supabase),
    listCalls(supabase),
    listAllExecutionSteps(supabase),
    listUtilities(supabase),
  ]);
  const input: AgendaInput = {
    projects,
    clients,
    steps,
    calls: calls.map((c) => ({
      id: c.id,
      code: c.code,
      utilityShortName: c.utility?.short_name ?? null,
      status: c.status,
      published_on: c.published_on,
      submission_deadline: c.submission_deadline,
    })),
  };
  return { input, clients, calls, utilities };
}
