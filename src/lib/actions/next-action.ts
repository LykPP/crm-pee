"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbError, optionalDate, parseForm, requiredText, type FormState } from "@/lib/forms";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  next_action_on: optionalDate.refine((v) => v !== null, "Informe a data."),
  next_action: requiredText("Escreva o que fazer."),
});

/** Sets the "próxima ação" of a client or a project. */
export async function setNextAction(
  table: "clients" | "projects",
  id: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { role } = await requireMembership();
  if (role === "viewer") return { error: "Você não tem permissão para fazer isso." };
  const { data, error } = parseForm(schema, form);
  if (!data) return { error };
  const supabase = await createClient();
  const res = await supabase.from(table).update(data).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar a próxima ação.") };
  if (!res.data.length) return { error: "Você não tem permissão para fazer isso." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearNextAction(table: "clients" | "projects", id: string): Promise<FormState> {
  const { role } = await requireMembership();
  if (role === "viewer") return { error: "Você não tem permissão para fazer isso." };
  const supabase = await createClient();
  const res = await supabase.from(table).update({ next_action_on: null, next_action: null }).eq("id", id);
  if (res.error) return { error: dbError(res.error, "Não foi possível limpar a próxima ação.") };
  revalidatePath("/", "layout");
  return { ok: true };
}
