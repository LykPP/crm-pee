import Link from "next/link";
import { notFound } from "next/navigation";
import { Compose } from "@/components/compose";
import { CopyButton } from "@/components/copy-button";
import { ContactList, InteractionDialog, Timeline } from "@/components/people";
import { UtilityFormDialog } from "../utility-form";
import { updateUtility } from "../actions";
import {
  getUtility,
  listCalls,
  listInteractions,
  listContacts,
  shortCallCode,
} from "@/lib/data/reference";
import { searchCallsUrl } from "@/lib/labels";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const strip = (url: string) => url.replace(/^https?:\/\//, "");

export default async function UtilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role } = await requireMembership();
  const supabase = await createClient();
  const utility = await getUtility(supabase, id);
  if (!utility) notFound();

  const [contacts, interactions, calls] = await Promise.all([
    listContacts(supabase, { column: "utility_id", id }),
    listInteractions(supabase, { column: "utility_id", id }),
    listCalls(supabase),
  ]);
  const utilityCalls = calls.filter((c) => c.utility_id === id);
  const canEditPeople = role !== "viewer";
  const parent = { utility_id: id };

  return (
    <div className="stack">
      <section className="box">
        <div className="sec">
          <div>
            <h2>{utility.name}</h2>
            {utility.concession_area && <p className="help">{utility.concession_area}</p>}
          </div>
          {role === "admin" && utility.org_id === org.id && (
            <UtilityFormDialog
              label="Editar"
              title="Editar distribuidora"
              action={updateUtility.bind(null, id)}
              utility={utility}
              buttonClass="btn sm ghost"
            />
          )}
        </div>
        <div className="row">
          <Compose
            label="Escrever e-mail"
            title={`E-mail para ${utility.name}`}
            to={contacts.find((c) => c.email)?.email ?? utility.pee_email}
            body={"Prezados,\n\n\n\nAtenciosamente,"}
            buttonClass="btn pri"
          />
          {canEditPeople && <InteractionDialog parent={parent} />}
          <a className="btn ghost" target="_blank" rel="noopener" href={searchCallsUrl(utility.name)}>
            Procurar editais na web
          </a>
        </div>
        <div className="facts">
          {utility.pee_email && (
            <div className="fact">
              <span className="l">E-mail do PEE</span>
              <span className="v">
                <span className="copyable">{utility.pee_email}</span> <CopyButton text={utility.pee_email} />
              </span>
            </div>
          )}
          {utility.website && (
            <div className="fact">
              <span className="l">Site</span>
              <span className="v">
                <a href={utility.website} target="_blank" rel="noopener">
                  {strip(utility.website)}
                </a>
              </span>
            </div>
          )}
          {utility.submission_url && (
            <div className="fact">
              <span className="l">Sistema de envio</span>
              <span className="v">
                <a href={utility.submission_url} target="_blank" rel="noopener">
                  {strip(utility.submission_url)}
                </a>
              </span>
            </div>
          )}
          {utility.address && (
            <div className="fact">
              <span className="l">Endereço</span>
              <span className="v">{utility.address}</span>
            </div>
          )}
        </div>
        {utilityCalls.length > 0 && (
          <div className="row">
            <span className="help">Editais:</span>
            {utilityCalls.map((c) => (
              <Link key={c.id} className="btn sm" href={`/editais/${c.id}`}>
                {shortCallCode({ code: c.code, utility: c.utility })}
              </Link>
            ))}
          </div>
        )}
        {utility.org_id === null && (
          <p className="help">Distribuidora de referência, mantida pela equipe do Painel PEE.</p>
        )}
      </section>
      <ContactList contacts={contacts} parent={parent} canEdit={canEditPeople} />
      <section className="box">
        <h3>Histórico</h3>
        <Timeline interactions={interactions} canEdit={canEditPeople} />
      </section>
    </div>
  );
}
