import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { OrgForm } from "./org-form";

export default async function NewOrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) redirect("/");

  return (
    <div className="solo">
      <div className="box">
        <div>
          <h1>Bem-vindo</h1>
          <p className="help">
            Entrou como {user.email}. Para começar, cadastre a sua empresa.
          </p>
        </div>
        <OrgForm />
        <form action={signOut}>
          <button type="submit" className="btn ghost">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
