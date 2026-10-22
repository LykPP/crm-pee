"use server";

import { revalidatePath } from "next/cache";
import { buildExampleRows, EXAMPLE_TABLES } from "@/lib/seed/examples";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type ExampleState = { error?: string; done?: string };

async function globalIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "utilities" | "calls",
) {
  const { data, error } = await supabase.from(table).select("id, slug").is("org_id", null);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.slug as string, r.id as string]));
}

async function deleteExamples(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  // Children of projects and clients are removed by cascade.
  for (const table of ["interactions", "projects", "clients"] as const) {
    const { error } = await supabase.from(table).delete().eq("org_id", orgId).eq("is_example", true);
    if (error) throw error;
  }
}

export async function loadExamples(): Promise<ExampleState> {
  const { org, role } = await requireMembership();
  if (role !== "admin") return { error: "Só o administrador pode carregar os exemplos." };
  const supabase = await createClient();

  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("is_example", true);
  if (count) return { error: "Os dados de exemplo já estão carregados." };

  try {
    const utilities = await globalIds(supabase, "utilities");
    const calls = await globalIds(supabase, "calls");
    if (!utilities.cemig || !calls["cemig-cpp-001-2026"]) {
      return { error: "Faltam os editais e distribuidoras de referência no banco." };
    }
    const rows = buildExampleRows(org.id, utilities, calls);
    for (const table of EXAMPLE_TABLES) {
      if (!rows[table].length) continue;
      const { error } = await supabase.from(table).insert(rows[table]);
      if (error) throw error;
    }
  } catch (err) {
    console.error("loadExamples failed", err);
    await deleteExamples(supabase, org.id).catch(() => {});
    return { error: "Não foi possível carregar os exemplos. Nada foi gravado." };
  }

  revalidatePath("/", "layout");
  return { done: "Dados de exemplo carregados." };
}

export async function removeExamples(): Promise<ExampleState> {
  const { org, role } = await requireMembership();
  if (role !== "admin") return { error: "Só o administrador pode remover os exemplos." };
  const supabase = await createClient();
  try {
    await deleteExamples(supabase, org.id);
  } catch (err) {
    console.error("removeExamples failed", err);
    return { error: "Não foi possível remover os exemplos." };
  }
  revalidatePath("/", "layout");
  return { done: "Dados de exemplo removidos." };
}
