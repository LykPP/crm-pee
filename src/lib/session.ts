import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "./session-labels";

export { ROLE_HINTS, ROLE_LABELS, type MemberRole } from "./session-labels";

/**
 * Whether people without an invitation may create an organization. The
 * switch lives in the database (app_settings), which enforces it too.
 */
export async function allowNewOrganizations() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("new_organizations_allowed");
  return data === true;
}

/**
 * Signed-in user plus the organization they work in. Pending invitations
 * for the user's e-mail are accepted on the way. Redirects when missing.
 * Cached per request, since layouts and pages both ask.
 */
export const requireMembership = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const find = () =>
    supabase
      .from("memberships")
      .select("role, organizations(id, name)")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
  let { data: membership } = await find();
  if (!membership) {
    const { data: joined } = await supabase.rpc("accept_invitations");
    if (joined) ({ data: membership } = await find());
  }
  if (!membership?.organizations) redirect("/organizacao/nova");

  // The join returns a single row for a many-to-one relation.
  const org = membership.organizations as unknown as { id: string; name: string };
  return { user, org, role: membership.role as MemberRole };
});
