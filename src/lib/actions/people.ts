"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  checkbox,
  dbError,
  optionalDate,
  optionalEmail,
  optionalText,
  parseForm,
  requiredText,
  type FormState,
} from "@/lib/forms";
import { INTERACTION_KINDS } from "@/lib/labels";
import { requireMembership, type MemberRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** What a contact or an interaction belongs to. */
export type Parent = { utility_id: string } | { client_id: string } | { project_id: string };

const EDITORS: MemberRole[] = ["admin", "technician", "sales"];

async function editorContext() {
  const ctx = await requireMembership();
  if (!EDITORS.includes(ctx.role)) return null;
  return { ...ctx, supabase: await createClient() };
}

const contactSchema = z.object({
  name: requiredText("Informe o nome."),
  job_title: optionalText,
  email: optionalEmail,
  phone: optionalText,
  is_primary: checkbox,
});

export async function addContact(parent: Parent, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para fazer isso." };
  const { data, error } = parseForm(contactSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase.from("contacts").insert({ ...data, ...parent, org_id: ctx.org.id });
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o contato.") };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateContact(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para fazer isso." };
  const { data, error } = parseForm(contactSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase.from("contacts").update(data).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o contato.") };
  if (!res.data.length) return { error: "Contato não encontrado." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteContact(id: string): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para fazer isso." };
  const res = await ctx.supabase.from("contacts").delete().eq("id", id);
  if (res.error) return { error: dbError(res.error, "Não foi possível excluir o contato.") };
  revalidatePath("/", "layout");
  return { ok: true };
}

const interactionSchema = z.object({
  kind: z.enum(Object.keys(INTERACTION_KINDS) as [keyof typeof INTERACTION_KINDS]),
  occurred_on: optionalDate.refine((v) => v !== null, "Informe a data."),
  summary: requiredText("Escreva o que foi conversado."),
  author_name: optionalText,
});

export async function addInteraction(parent: Parent, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para fazer isso." };
  const { data, error } = parseForm(interactionSchema, form);
  if (!data) return { error };

  const row: Record<string, unknown> = { ...data, ...parent, org_id: ctx.org.id };
  // A conversation about a project also belongs to its client's history.
  if ("project_id" in parent) {
    const p = await ctx.supabase.from("projects").select("client_id").eq("id", parent.project_id).single();
    if (p.data) row.client_id = p.data.client_id;
  }
  const res = await ctx.supabase.from("interactions").insert(row);
  if (res.error) return { error: dbError(res.error, "Não foi possível registrar o contato.") };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteInteraction(id: string): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para fazer isso." };
  const res = await ctx.supabase.from("interactions").delete().eq("id", id);
  if (res.error) return { error: dbError(res.error, "Não foi possível excluir o registro.") };
  revalidatePath("/", "layout");
  return { ok: true };
}
