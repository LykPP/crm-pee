"use server";

import { redirect } from "next/navigation";
import { allowNewOrganizations } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CreateOrgState = { error?: string };

export async function createOrganization(
  _prev: CreateOrgState,
  form: FormData,
): Promise<CreateOrgState> {
  if (!allowNewOrganizations()) return { error: "Peça um convite ao administrador da sua ESCO." };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Digite o nome da empresa." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { org_name: name });
  if (error && !/already belongs/.test(error.message)) {
    return { error: "Não foi possível criar a organização. Tente de novo." };
  }
  redirect("/");
}
