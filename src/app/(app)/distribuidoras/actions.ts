"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  dbError,
  optionalEmail,
  optionalText,
  optionalUrl,
  parseForm,
  requiredText,
  type FormState,
} from "@/lib/forms";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const utilitySchema = z.object({
  name: requiredText("Informe o nome."),
  short_name: optionalText,
  state: optionalText,
  concession_area: optionalText,
  website: optionalUrl,
  pee_email: optionalEmail,
  submission_url: optionalUrl,
  address: optionalText,
});

async function adminContext() {
  const ctx = await requireMembership();
  if (ctx.role !== "admin") return null;
  return { ...ctx, supabase: await createClient() };
}

export async function createUtility(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador cadastra distribuidoras." };
  const { data, error } = parseForm(utilitySchema, form);
  if (!data) return { error };
  const res = await ctx.supabase
    .from("utilities")
    .insert({ ...data, short_name: data.short_name ?? data.name, org_id: ctx.org.id })
    .select("id")
    .single();
  if (res.error) return { error: dbError(res.error, "Não foi possível cadastrar a distribuidora.") };
  revalidatePath("/distribuidoras", "layout");
  redirect(`/distribuidoras/${res.data.id}`);
}

export async function updateUtility(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador edita distribuidoras." };
  const { data, error } = parseForm(utilitySchema, form);
  if (!data) return { error };
  const res = await ctx.supabase
    .from("utilities")
    .update({ ...data, short_name: data.short_name ?? data.name })
    .eq("id", id)
    .select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar a distribuidora.") };
  if (!res.data.length) return { error: "Esta distribuidora não pode ser editada pela sua ESCO." };
  revalidatePath("/distribuidoras", "layout");
  return { ok: true };
}
