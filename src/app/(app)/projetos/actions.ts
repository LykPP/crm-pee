"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  checkbox,
  dbError,
  optionalDate,
  optionalText,
  optionalUrl,
  parseForm,
  requiredText,
  type FormState,
} from "@/lib/forms";
import { STAGES } from "@/lib/pee";
import { requireMembership, type MemberRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const PROJECT_EDITORS: MemberRole[] = ["admin", "technician", "sales"];
const DETAIL_EDITORS: MemberRole[] = ["admin", "technician"];
const DENIED = { error: "Você não tem permissão para fazer isso." };

const uuidOrNull = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

const projectSchema = z.object({
  name: requiredText("Informe o nome do projeto."),
  client_id: z.uuid("Escolha o cliente."),
  call_id: uuidOrNull,
  typology: optionalText,
  modality: z.enum(["fp", "cd"]),
  voltage_level: optionalText,
  municipality: optionalText,
  responsible: optionalText,
  stage: z.enum(STAGES as [string, ...string[]]),
  is_micro_small_business: checkbox,
  has_non_removable_uses: checkbox,
  is_heritage_listed: checkbox,
  has_incentivized_source: checkbox,
  requires_public_bidding: checkbox,
});

async function context(roles: MemberRole[]) {
  const ctx = await requireMembership();
  if (!roles.includes(ctx.role)) return null;
  return { ...ctx, supabase: await createClient() };
}

function done(projectId?: string) {
  revalidatePath("/", "layout");
  if (projectId) revalidatePath(`/projetos/${projectId}`);
  return { ok: true };
}

export async function createProject(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await context(PROJECT_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(projectSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase
    .from("projects")
    .insert({ ...data, org_id: ctx.org.id })
    .select("id")
    .single();
  if (res.error) return { error: dbError(res.error, "Não foi possível criar o projeto.") };
  revalidatePath("/", "layout");
  redirect(`/projetos/${res.data.id}`);
}

export async function updateProject(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await context(PROJECT_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(projectSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase.from("projects").update(data).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o projeto.") };
  if (!res.data.length) return DENIED;
  return done(id);
}

export async function deleteProject(id: string): Promise<FormState> {
  const ctx = await context(["admin"]);
  if (!ctx) return { error: "Só o administrador exclui projetos." };
  const res = await ctx.supabase.from("projects").delete().eq("id", id);
  if (res.error) return { error: dbError(res.error, "Não foi possível excluir o projeto.") };
  revalidatePath("/", "layout");
  redirect("/projetos");
}

export async function setStage(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await context(PROJECT_EDITORS);
  if (!ctx) return DENIED;
  const stage = z.enum(STAGES as [string, ...string[]]).safeParse(form.get("stage"));
  if (!stage.success) return { error: "Etapa inválida." };
  const res = await ctx.supabase.from("projects").update({ stage: stage.data }).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível mudar a etapa.") };
  if (!res.data.length) return DENIED;
  return done(id);
}

export async function setFolder(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await context(PROJECT_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(z.object({ folder_url: optionalUrl }), form);
  if (!data) return { error };
  const res = await ctx.supabase.from("projects").update(data).eq("id", id).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o link.") };
  if (!res.data.length) return DENIED;
  return done(id);
}

const unitSchema = z.object({
  number: requiredText("Informe o número da UC.").transform((v) => v.replace(/\s+/g, "")),
  description: optionalText,
});

export async function addUnit(projectId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await context(DETAIL_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(unitSchema, form);
  if (!data) return { error };
  const { count } = await ctx.supabase
    .from("consumer_units")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const res = await ctx.supabase
    .from("consumer_units")
    .insert({ ...data, project_id: projectId, org_id: ctx.org.id, position: count ?? 0 });
  if (res.error) return { error: dbError(res.error, "Não foi possível adicionar a UC.") };
  return done(projectId);
}

export async function updateUnit(
  projectId: string,
  unitId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await context(DETAIL_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(unitSchema, form);
  if (!data) return { error };
  const res = await ctx.supabase.from("consumer_units").update(data).eq("id", unitId).select("id");
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar a UC.") };
  if (!res.data.length) return DENIED;
  return done(projectId);
}

export async function deleteUnit(projectId: string, unitId: string): Promise<FormState> {
  const ctx = await context(DETAIL_EDITORS);
  if (!ctx) return DENIED;
  const res = await ctx.supabase.from("consumer_units").delete().eq("id", unitId);
  if (res.error) return { error: dbError(res.error, "Não foi possível remover a UC.") };
  return done(projectId);
}

const documentSchema = z
  .object({
    status: z.enum(["pending", "ok", "na"]),
    file_path: optionalText,
    issued_on: optionalDate,
    valid_until: optionalDate,
    notes: optionalText,
  })
  .refine((d) => !d.issued_on || !d.valid_until || d.valid_until >= d.issued_on, {
    message: "A validade não pode ser anterior à emissão.",
  });

/** Records the status, file and dates of one checklist item (per unit when scoped). */
export async function saveDocument(
  projectId: string,
  itemKey: string,
  unitId: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await context(DETAIL_EDITORS);
  if (!ctx) return DENIED;
  const { data, error } = parseForm(documentSchema, form);
  if (!data) return { error };

  let existing = ctx.supabase
    .from("project_documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("item_key", itemKey);
  existing = unitId ? existing.eq("consumer_unit_id", unitId) : existing.is("consumer_unit_id", null);
  const found = await existing.maybeSingle();
  if (found.error) return { error: dbError(found.error, "Não foi possível salvar o documento.") };

  const res = found.data
    ? await ctx.supabase.from("project_documents").update(data).eq("id", found.data.id)
    : await ctx.supabase.from("project_documents").insert({
        ...data,
        org_id: ctx.org.id,
        project_id: projectId,
        item_key: itemKey,
        consumer_unit_id: unitId,
      });
  if (res.error) return { error: dbError(res.error, "Não foi possível salvar o documento.") };
  return done(projectId);
}
