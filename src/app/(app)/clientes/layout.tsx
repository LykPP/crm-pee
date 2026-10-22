import { DetailPane } from "@/components/detail-pane";
import { ClientFormDialog } from "./client-form";
import { ClientList } from "./client-list";
import { createClientRecord } from "./actions";
import { listClients } from "@/lib/data/clients";
import { listCalls, listUtilities } from "@/lib/data/reference";
import { typologyOptions } from "@/lib/data/typologies";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const [clients, utilities, calls] = await Promise.all([
    listClients(supabase),
    listUtilities(supabase),
    listCalls(supabase),
  ]);

  const items = clients.map((c) => ({
    id: c.id,
    name: c.name,
    municipality: c.municipality,
    status: c.status,
    searchText: [c.name, c.municipality, c.typology, c.cnpj].join(" ").toLowerCase(),
  }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Clientes</h1>
          <p>Onde os projetos acontecem: hospitais, prefeituras, escolas, indústrias e condomínios.</p>
        </div>
        {role !== "viewer" && (
          <ClientFormDialog
            label="Novo cliente"
            title="Novo cliente"
            action={createClientRecord}
            utilities={utilities}
            typologies={typologyOptions(calls)}
            defaultUtilityId={utilities.find((u) => u.short_name === "Cemig D")?.id}
            buttonClass="btn pri"
          />
        )}
      </div>
      <div className="split">
        <ClientList clients={items} />
        <DetailPane>{children}</DetailPane>
      </div>
    </>
  );
}
