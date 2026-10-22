import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { allowNewOrganizations } from "@/lib/session";
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
  const { data: joined } = await supabase.rpc("accept_invitations");
  if (joined) redirect("/");

  return (
    <div className="solo">
      <div className="box">
        {(await allowNewOrganizations()) ? (
          <>
            <div>
              <h1>Bem-vindo</h1>
              <p className="help">Entrou como {user.email}. Para começar, cadastre a sua empresa.</p>
            </div>
            <OrgForm />
          </>
        ) : (
          <div className="stack">
            <h1>Falta o convite</h1>
            <p>
              Você entrou como <b>{user.email}</b>, mas este e-mail ainda não faz parte de nenhuma
              ESCO no Painel PEE.
            </p>
            <p className="help">
              Peça ao administrador da sua ESCO para convidar este e-mail na tela Equipe. Depois é só
              entrar de novo.
            </p>
          </div>
        )}
        <form action={signOut}>
          <button type="submit" className="btn ghost">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
