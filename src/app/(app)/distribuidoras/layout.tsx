import { UtilityFormDialog } from "./utility-form";
import { UtilityList } from "./utility-list";
import { createUtility } from "./actions";
import { listCalls, listUtilities } from "@/lib/data/reference";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function UtilitiesLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const [utilities, calls] = await Promise.all([listUtilities(supabase), listCalls(supabase)]);

  const items = utilities.map((u) => ({
    id: u.id,
    name: u.name,
    subtitle: `${u.state ?? ""} · ${calls.filter((c) => c.utility_id === u.id).length} edital(is)`,
  }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Distribuidoras</h1>
          <p>Quem abre as chamadas públicas e como falar com cada uma.</p>
        </div>
        {role === "admin" && (
          <UtilityFormDialog
            label="Cadastrar distribuidora"
            title="Cadastrar distribuidora"
            action={createUtility}
            buttonClass="btn pri"
          />
        )}
      </div>
      <div className="split">
        <div>
          {items.length ? (
            <UtilityList items={items} />
          ) : (
            <div className="empty">
              <b>Nenhuma distribuidora</b>
              <span>Cadastre as concessionárias com quem a ESCO trabalha.</span>
            </div>
          )}
        </div>
        <div>{children}</div>
      </div>
    </>
  );
}
