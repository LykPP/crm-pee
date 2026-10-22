"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbError, optionalText, parseForm, requiredText, type FormState } from "@/lib/forms";
import { requireMembership, type MemberRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const EDITORS: MemberRole[] = ["admin", "technician", "sales"];

const clientSchema = z.object({
  name: requiredText("Informe o nome do cliente."),
  kind: optionalText,
  cnpj: optionalText,
  municipality: optionalText,
  state: optionalText.transform((v) => v?.toUpperCase() ?? null),
  utility_id: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  typology: optionalText,
  modality: z
    .enum(["fp", "cd", ""])
    .optional()
    .transform((v) => v || null),
  status: z.enum(["lead", "qualified", "active", "inactive"]),
  notes: optionalText,
});

async function editorContext() {
  const ctx = await requireMembership();
  if (!EDITORS.includes(ctx.role)) return null;
  return { ...ctx, supabase: await createClient() };
}

export async function createClientRecord(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para cadastrar clientes." };
  const { data, error } = parseForm(clientSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase
    .from("clients")
    .insert({ ...data, org_id: ctx.org.id })
    .select("id")
    .single();
  if (res.error) return { error: dbError(res.error, "Não foi possível cadastrar o cliente.") };
  revalidatePath("/clientes", "layout");
  redirect(`/clientes/${res.data.id}`);
}

export async function updateClientRecord(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await editorContext();
  if (!ctx) return { error: "Você não tem permissão para editar clientes." };
  const { data, error } = parseForm(clientSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase.from("clients").update(data).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o cliente.") };
  if (!res.data.length) return { error: "Cliente não encontrado." };
  revalidatePath("/clientes", "layout");
  return { ok: true };
}

export async function deleteClientRecord(id: string): Promise<FormState> {
  const ctx = await requireMembership();
  if (ctx.role !== "admin") return { error: "Só o administrador exclui clientes." };
  const supabase = await createClient();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);
  if (count) return { error: "Este cliente tem projetos. Exclua os projetos antes." };
  const res = await supabase.from("clients").delete().eq("id", id);
  if (res.error) return { error: dbError(res.error, "Não foi possível excluir o cliente.") };
  revalidatePath("/clientes", "layout");
  redirect("/clientes");
}
