"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  dbError,
  optionalDate,
  optionalEmail,
  optionalMoney,
  optionalText,
  optionalUrl,
  parseForm,
  requiredText,
  type FormState,
} from "@/lib/forms";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const callSchema = z.object({
  code: requiredText("Informe o código do edital."),
  name: optionalText,
  utility_id: z.uuid("Escolha a distribuidora."),
  status: z.enum(["upcoming", "open", "to_verify", "closed"]),
  published_on: optionalDate,
  submission_deadline: optionalDate,
  total_budget: optionalMoney,
  call_url: optionalUrl,
  submission_url: optionalUrl,
  clarification_email: optionalEmail,
  deadline_note: optionalText,
  notes: optionalText,
});

async function adminContext() {
  const ctx = await requireMembership();
  if (ctx.role !== "admin") return null;
  return { ...ctx, supabase: await createClient() };
}

export async function createCall(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador cadastra editais." };
  const { data, error } = parseForm(callSchema, form);
  if (!data) return { error };

  const res = await ctx.supabase
    .from("calls")
    .insert({ ...data, name: data.name ?? data.code, org_id: ctx.org.id })
    .select("id")
    .single();
  if (res.error) return { error: dbError(res.error, "Não foi possível cadastrar o edital.") };
  revalidatePath("/editais", "layout");
  redirect(`/editais/${res.data.id}`);
}

export async function updateCall(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador edita editais." };
  const { data, error } = parseForm(callSchema, form);
  if (!data) return { error };

  const res = await ctx.supabase
    .from("calls")
    .update({ ...data, name: data.name ?? data.code })
    .eq("id", id)
    .select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o edital.") };
  if (!res.data.length) return { error: "Este edital não pode ser editado pela sua ESCO." };
  revalidatePath("/editais", "layout");
  return { ok: true };
}

/** Copies a reference call, rules included, so the organization can adjust it. */
export async function copyCall(id: string): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador copia editais." };

  const src = await ctx.supabase.from("calls").select("*").eq("id", id).single();
  if (src.error) return { error: dbError(src.error, "Edital não encontrado.") };
  const copy: Record<string, unknown> = { ...src.data, org_id: ctx.org.id, source_call_id: id };
  for (const key of ["id", "slug", "created_at", "updated_at"]) delete copy[key];

  const res = await ctx.supabase
    .from("calls")
    .insert(copy)
    .select("id")
    .single();
  if (res.error) return { error: dbError(res.error, "Não foi possível copiar o edital.") };
  revalidatePath("/editais", "layout");
  redirect(`/editais/${res.data.id}`);
}

export async function deleteCall(id: string): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Só o administrador exclui editais." };
  const res = await ctx.supabase.from("calls").delete().eq("id", id).select("id");
  if (res.error) {
    const inUse = res.error.code === "23503";
    return { error: inUse ? "Há projetos ligados a este edital." : dbError(res.error, "Não foi possível excluir.") };
  }
  revalidatePath("/editais", "layout");
  redirect("/editais");
}
