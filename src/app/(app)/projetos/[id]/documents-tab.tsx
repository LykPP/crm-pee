import Link from "next/link";
import { Compose } from "@/components/compose";
import { FormDialog } from "@/components/form-dialog";
import { formatDate } from "@/lib/labels";
import type { clientMessage } from "@/lib/messages";
import type { DocumentRow } from "@/lib/pee";
import { saveDocument } from "../actions";

const PENDING = ["missing", "expired", "no_date"];

const STATUS_OPTIONS: [string, string][] = [
  ["pending", "Falta"],
  ["ok", "Recebido e conferido"],
  ["na", "Não se aplica"],
];

function DocumentDialog({ projectId, row }: { projectId: string; row: DocumentRow }) {
  const r = row.record;
  return (
    <FormDialog
      label="Atualizar"
      title={row.item.name + (row.unit ? ` · UC ${row.unit.number}` : "")}
      action={saveDocument.bind(null, projectId, row.item.id, row.unit?.id ?? null)}
      buttonClass="btn sm"
    >
      {(row.item.ref || row.item.hint) && (
        <p className="small muted">{[row.item.ref, row.item.hint].filter(Boolean).join(" · ")}</p>
      )}
      <div className="fgrid">
        <div className="field full">
          <label htmlFor="doc-status">Situação</label>
          <select id="doc-status" name="status" defaultValue={r?.status ?? "pending"}>
            {STATUS_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="doc-file">Nome do arquivo na pasta</label>
          <input id="doc-file" name="file_path" defaultValue={r?.file_path ?? ""} />
          <span className="hint">Ex.: 02_Certidoes/CND_Federal.pdf</span>
        </div>
        <div className="field">
          <label htmlFor="doc-issued">Data de emissão</label>
          <input id="doc-issued" name="issued_on" type="date" defaultValue={r?.issued_on ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="doc-valid">Válido até</label>
          <input id="doc-valid" name="valid_until" type="date" defaultValue={r?.valid_until ?? ""} />
        </div>
        <div className="field full">
          <label htmlFor="doc-notes">Observação</label>
          <textarea id="doc-notes" name="notes" defaultValue={r?.notes ?? ""} />
        </div>
      </div>
    </FormDialog>
  );
}

export function DocumentsTab({
  projectId,
  rows,
  hasChecklist,
  deadline,
  showAll,
  canEdit,
  message,
  contact,
}: {
  projectId: string;
  rows: DocumentRow[];
  hasChecklist: boolean;
  deadline: string | null;
  showAll: boolean;
  canEdit: boolean;
  message: ReturnType<typeof clientMessage>;
  contact?: { email: string | null; phone: string | null };
}) {
  if (!hasChecklist) {
    return <div className="banner">Este edital ainda não tem a lista de documentos carregada.</div>;
  }
  const pending = rows.filter((r) => PENDING.includes(r.status.kind));
  const shown = showAll ? rows : pending;
  const groups = new Map<string, DocumentRow[]>();
  for (const r of shown) groups.set(r.item.group, [...(groups.get(r.item.group) ?? []), r]);
  const base = `/projetos/${projectId}?aba=documentos`;

  return (
    <>
      <div className="sec">
        <div className="seg" role="group" aria-label="Filtrar documentos">
          <Link href={base} aria-current={!showAll ? "true" : undefined} className="segbtn" scroll={false}>
            Pendentes ({pending.length})
          </Link>
          <Link href={`${base}&filtro=todos`} aria-current={showAll ? "true" : undefined} className="segbtn" scroll={false}>
            Todos ({rows.length})
          </Link>
        </div>
        <Compose
          label="Pedir pendências ao cliente"
          title="Mensagem para o cliente"
          to={contact?.email}
          phone={contact?.phone}
          subject={message.subject}
          body={message.body}
        />
      </div>
      <p className="help">
        Validades conferidas contra o prazo de envio ({formatDate(deadline)}).
        {canEdit && " Clique em Atualizar para registrar o arquivo e as datas."}
      </p>
      {shown.length ? (
        [...groups.entries()].map(([group, items]) => (
          <section key={group} className="box">
            <h3>{group}</h3>
            <div>
              {items.map((r) => (
                <div key={r.item.id + (r.unit?.id ?? "")} className="docrow">
                  <div className="grow">
                    <div>
                      <b>{r.item.name}</b>
                      {r.unit && <> <span className="chip mono">UC {r.unit.number}</span></>}
                    </div>
                    <div className="s">
                      {r.record?.file_path || r.item.hint || r.item.ref}
                      {r.record?.valid_until
                        ? ` · válido até ${formatDate(r.record.valid_until)}`
                        : r.record?.issued_on
                          ? ` · emitido em ${formatDate(r.record.issued_on)}`
                          : ""}
                    </div>
                    {r.record?.notes && <div className="s">{r.record.notes}</div>}
                  </div>
                  <span className={`chip ${r.status.tone}`}>{r.status.label}</span>
                  {canEdit &&
                    (r.item.scope === "consumer_unit" && !r.unit ? (
                      <span className="help">Cadastre as UCs na Visão geral</span>
                    ) : (
                      <DocumentDialog projectId={projectId} row={r} />
                    ))}
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="empty">
          <b>Nenhum documento pendente</b>
          <span>Todos os documentos exigidos estão completos e dentro da validade.</span>
        </div>
      )}
    </>
  );
}
