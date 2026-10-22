import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { Compose } from "@/components/compose";
import { NextActionBox } from "@/components/next-action";
import { ContactList, InteractionDialog, Timeline } from "@/components/people";
import { ProjectCard } from "@/components/project-card";
import { ClientFormDialog } from "../client-form";
import { ProjectFormDialog } from "../../projetos/project-form";
import { createProject } from "../../projetos/actions";
import { deleteClientRecord, updateClientRecord } from "../actions";
import { getClient, listClients } from "@/lib/data/clients";
import { projectFormOptions } from "@/lib/data/project-options";
import { loadProjectBundles } from "@/lib/data/projects";
import { listCalls, listContacts, listInteractions, listUtilities } from "@/lib/data/reference";
import { typologyOptions } from "@/lib/data/typologies";
import { MODALITY_LABELS, clientMessage, type ClientMessageKind } from "@/lib/messages";
import { todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const TEMPLATES: [ClientMessageKind, string][] = [
  ["presentation", "Apresentar o PEE"],
  ["visit", "Agendar visita"],
  ["documents", "Pedir documentos"],
];

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireMembership();
  const supabase = await createClient();
  const client = await getClient(supabase, id);
  if (!client) notFound();

  const [contacts, interactions, bundles, calls, utilities, clients] = await Promise.all([
    listContacts(supabase, { column: "client_id", id }),
    listInteractions(supabase, { column: "client_id", id }),
    loadProjectBundles(supabase, role),
    listCalls(supabase),
    listUtilities(supabase),
    listClients(supabase),
  ]);
  const today = todayInBrazil();
  const projects = bundles.filter((b) => b.project.client_id === id);
  const active = projects.find((b) => b.project.stage !== "lost") ?? null;
  const call = active?.call
    ? calls.find((c) => c.id === active.call!.id)
    : calls.find((c) => c.status === "open");
  const contact = contacts.find((c) => c.is_primary) ?? contacts[0];
  const canEdit = role !== "viewer";
  const utility = utilities.find((u) => u.id === client.utility_id);

  const message = (kind: ClientMessageKind) =>
    clientMessage(kind, {
      client,
      contactName: contact?.name,
      project: active,
      call: call && {
        code: call.code,
        submission_deadline: call.submission_deadline,
        utilityName: call.utility?.name ?? null,
      },
      today,
    });

  return (
    <div className="stack">
      <section className="box">
        <div className="sec">
          <div>
            <h2>
              {client.name} {client.is_example && <span className="chip ex">exemplo</span>}
            </h2>
            <p className="help">
              {[client.kind, [client.municipality, client.state].filter(Boolean).join("/")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="row">
            {canEdit && (
              <ClientFormDialog
                label="Editar"
                title="Editar cliente"
                action={updateClientRecord.bind(null, id)}
                client={client}
                utilities={utilities}
                typologies={typologyOptions(calls)}
                buttonClass="btn sm ghost"
              />
            )}
            {role === "admin" && (
              <ActionButton
                action={deleteClientRecord.bind(null, id)}
                label="Excluir"
                confirm={`Excluir "${client.name}"? Os registros de contato dele também serão apagados.`}
                className="btn sm ghost danger"
              />
            )}
          </div>
        </div>
        <NextActionBox
          table="clients"
          id={id}
          date={client.next_action_on}
          text={client.next_action}
          today={today}
          canEdit={canEdit}
        />
        <div>
          <h4 style={{ marginBottom: 8 }}>Escrever para o cliente</h4>
          <div className="row">
            {TEMPLATES.map(([kind, label]) => {
              const m = message(kind);
              return (
                <Compose
                  key={kind}
                  label={label}
                  title={`Mensagem para ${client.name}`}
                  to={contact?.email}
                  phone={contact?.phone}
                  subject={m.subject}
                  body={m.body}
                />
              );
            })}
            {canEdit && <InteractionDialog parent={{ client_id: id }} buttonClass="btn ghost" />}
          </div>
        </div>
      </section>

      <section className="box">
        <div className="sec">
          <h3>Projetos</h3>
          {canEdit && (
            <ProjectFormDialog
              label="Criar projeto"
              title="Novo projeto"
              action={createProject}
              buttonClass="btn sm ghost"
              defaultClientId={id}
              {...projectFormOptions(clients, calls)}
            />
          )}
        </div>
        {projects.length ? (
          <div className="cardgrid">
            {projects.map((b) => (
              <ProjectCard
                key={b.project.id}
                bundle={b}
                isExample={b.project.is_example}
                today={today}
              />
            ))}
          </div>
        ) : (
          <p className="help">Nenhum projeto ainda.</p>
        )}
      </section>

      <ContactList contacts={contacts} parent={{ client_id: id }} canEdit={canEdit} />

      <section className="box">
        <h3>Histórico</h3>
        <Timeline interactions={interactions} canEdit={canEdit} visible={3} />
      </section>

      <details className="more">
        <summary>Dados cadastrais</summary>
        <div className="in">
          <div className="facts">
            <div className="fact">
              <span className="l">CNPJ</span>
              <span className="v mono">{client.cnpj || "—"}</span>
            </div>
            <div className="fact">
              <span className="l">Distribuidora</span>
              <span className="v">{utility?.name ?? "—"}</span>
            </div>
            <div className="fact">
              <span className="l">Tipologia</span>
              <span className="v">{client.typology || "—"}</span>
            </div>
            <div className="fact">
              <span className="l">Modalidade</span>
              <span className="v">{client.modality ? MODALITY_LABELS[client.modality] : "—"}</span>
            </div>
          </div>
          {client.notes && <p className="small">{client.notes}</p>}
        </div>
      </details>
    </div>
  );
}
