import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = "admin" | "technician" | "sales" | "viewer";

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Administrador",
  technician: "Técnico",
  sales: "Comercial",
  viewer: "Leitor",
};

/** Signed-in user plus the organization they work in. Redirects when missing. */
export async function requireMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership?.organizations) redirect("/organizacao/nova");

  // The join returns a single row for a many-to-one relation.
  const org = membership.organizations as unknown as { id: string; name: string };
  return { user, org, role: membership.role as MemberRole };
}
