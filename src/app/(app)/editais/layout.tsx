import { DetailPane } from "@/components/detail-pane";
import { CallFormDialog } from "./call-form";
import { CallList } from "./call-list";
import { createCall } from "./actions";
import { listCalls, listUtilities, shortCallCode } from "@/lib/data/reference";
import { formatDate, searchCallsUrl } from "@/lib/labels";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function CallsLayout({ children }: { children: React.ReactNode }) {
  const { org, role } = await requireMembership();
  const supabase = await createClient();
  const [calls, utilities] = await Promise.all([listCalls(supabase), listUtilities(supabase)]);

  const items = calls.map((c) => ({
    id: c.id,
    status: c.status,
    title: `${c.utility?.short_name ?? ""} ${shortCallCode(c)}`.trim(),
    subtitle:
      (c.submission_deadline ? `Prazo ${formatDate(c.submission_deadline)}` : "Prazo a confirmar") +
      (c.org_id === org.id ? " · cópia da ESCO" : ""),
  }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Editais</h1>
          <p>Chamadas públicas, prazos e o que cada uma exige.</p>
        </div>
        {role === "admin" && (
          <CallFormDialog
            label="Cadastrar edital"
            title="Cadastrar edital"
            action={createCall}
            utilities={utilities}
            buttonClass="btn pri"
          />
        )}
      </div>
      <div className="split">
        <div>
          {items.length ? (
            <CallList calls={items} />
          ) : (
            <div className="empty">
              <b>Nenhum edital</b>
              <span>Cadastre o primeiro edital.</span>
            </div>
          )}
          <details className="more" style={{ marginTop: 12 }}>
            <summary>Procurar novos editais</summary>
            <div className="in">
              <p className="help">Abre uma busca na web por chamadas públicas de cada distribuidora.</p>
              <div className="row">
                {utilities.map((u) => (
                  <a key={u.id} className="btn sm" target="_blank" rel="noopener" href={searchCallsUrl(u.name)}>
                    {u.short_name || u.name}
                  </a>
                ))}
              </div>
            </div>
          </details>
        </div>
        <DetailPane>{children}</DetailPane>
      </div>
    </>
  );
}
