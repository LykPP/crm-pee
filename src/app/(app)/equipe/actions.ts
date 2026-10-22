"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbError, parseForm, type FormState } from "@/lib/forms";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["admin", "technician", "sales", "viewer"] as const;

async function adminContext() {
  const ctx = await requireMembership();
  if (ctx.role !== "admin") return null;
  return { ...ctx, supabase: await createClient() };
}

const DENIED = { error: "Só o administrador gerencia a equipe." };

function teamError(error: { message: string; code?: string }, fallback: string) {
  if (/keep an admin/.test(error.message)) return "A ESCO precisa de pelo menos um administrador.";
  if (error.code === "23505") return "Já existe um convite pendente para este e-mail.";
  return dbError(error, fallback);
}

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Confira o e-mail.")),
  role: z.enum(ROLES),
});

export async function inviteMember(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return DENIED;
  const { data, error } = parseForm(inviteSchema, form);
  if (!data) return { error };
  const members = await ctx.supabase.rpc("list_members", { target_org: ctx.org.id });
  if ((members.data as { email: string }[] | null)?.some((m) => m.email.toLowerCase() === data.email)) {
    return { error: "Esta pessoa já faz parte da equipe." };
  }
  const res = await ctx.supabase.from("invitations").insert({ ...data, org_id: ctx.org.id });
  if (res.error) return { error: teamError(res.error, "Não foi possível criar o convite.") };
  revalidatePath("/equipe");
  return { ok: true };
}

export async function cancelInvitation(id: string): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return DENIED;
  const res = await ctx.supabase.from("invitations").delete().eq("id", id);
  if (res.error) return { error: teamError(res.error, "Não foi possível cancelar o convite.") };
  revalidatePath("/equipe");
  return { ok: true };
}

export async function changeRole(userId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return DENIED;
  const role = z.enum(ROLES).safeParse(form.get("role"));
  if (!role.success) return { error: "Papel inválido." };
  const res = await ctx.supabase.rpc("set_member_role", {
    target_org: ctx.org.id,
    target_user: userId,
    new_role: role.data,
  });
  if (res.error) return { error: teamError(res.error, "Não foi possível mudar o papel.") };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return DENIED;
  const res = await ctx.supabase.rpc("remove_member", { target_org: ctx.org.id, target_user: userId });
  if (res.error) return { error: teamError(res.error, "Não foi possível remover a pessoa.") };
  revalidatePath("/equipe");
  return { ok: true };
}
