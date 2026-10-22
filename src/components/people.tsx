import type { ContactRow, InteractionRow } from "@/lib/data/reference";
import {
  addContact,
  addInteraction,
  deleteContact,
  deleteInteraction,
  updateContact,
  type Parent,
} from "@/lib/actions/people";
import { INTERACTION_KINDS, formatDate, whatsappUrl } from "@/lib/labels";
import { todayInBrazil } from "@/lib/pee";
import { ActionButton } from "./action-button";
import { CopyButton } from "./copy-button";
import { FormDialog } from "./form-dialog";

function ContactFields({ contact }: { contact?: ContactRow }) {
  return (
    <div className="fgrid">
      <div className="field full">
        <label htmlFor="c-name">Nome</label>
        <input id="c-name" name="name" required defaultValue={contact?.name} />
      </div>
      <div className="field full">
        <label htmlFor="c-job">Cargo</label>
        <input id="c-job" name="job_title" defaultValue={contact?.job_title ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="c-email">E-mail</label>
        <input id="c-email" name="email" type="email" defaultValue={contact?.email ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="c-phone">Telefone</label>
        <input id="c-phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
      </div>
      <label className="field check full">
        <input type="checkbox" name="is_primary" defaultChecked={contact?.is_primary} />
        Contato principal
      </label>
    </div>
  );
}

export function ContactList({
  contacts,
  parent,
  canEdit,
}: {
  contacts: ContactRow[];
  parent: Parent;
  canEdit: boolean;
}) {
  return (
    <section className="box">
      <div className="sec">
        <h3>Pessoas de contato</h3>
        {canEdit && (
          <FormDialog
            label="Adicionar"
            title="Adicionar contato"
            action={addContact.bind(null, parent)}
            buttonClass="btn sm ghost"
          >
            <ContactFields />
          </FormDialog>
        )}
      </div>
      {contacts.length ? (
        <div className="list">
          {contacts.map((c) => (
            <div key={c.id} className="item">
              <div className="grow">
                <div className="t">
                  {c.name} {c.is_primary && <span className="chip acc">principal</span>}
                </div>
                {c.job_title && <div className="s">{c.job_title}</div>}
                <div className="row small" style={{ marginTop: 6 }}>
                  {c.email && (
                    <>
                      <span className="copyable">{c.email}</span>
                      <CopyButton text={c.email} />
                    </>
                  )}
                  {c.phone && (
                    <>
                      <span className="copyable">{c.phone}</span>
                      <a className="btn sm ghost" target="_blank" rel="noopener" href={whatsappUrl(c.phone)}>
                        WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>
              {canEdit && (
                <FormDialog
                  label="Editar"
                  title="Editar contato"
                  action={updateContact.bind(null, c.id)}
                  buttonClass="btn sm ghost"
                  extraFooter={
                    <ActionButton
                      action={deleteContact.bind(null, c.id)}
                      label="Excluir"
                      confirm={`Excluir ${c.name}?`}
                      className="btn danger"
                    />
                  }
                >
                  <ContactFields contact={c} />
                </FormDialog>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="help">Nenhuma pessoa cadastrada ainda.</p>
      )}
    </section>
  );
}

export function InteractionDialog({
  parent,
  label = "Registrar contato",
  buttonClass = "btn",
}: {
  parent: Parent;
  label?: string;
  buttonClass?: string;
}) {
  return (
    <FormDialog
      label={label}
      title="Registrar contato"
      action={addInteraction.bind(null, parent)}
      buttonClass={buttonClass}
    >
      <div className="fgrid">
        <div className="field">
          <label htmlFor="i-kind">Tipo</label>
          <select id="i-kind" name="kind" defaultValue="call">
            {Object.entries(INTERACTION_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="i-date">Data</label>
          <input id="i-date" name="occurred_on" type="date" required defaultValue={todayInBrazil()} />
        </div>
        <div className="field full">
          <label htmlFor="i-summary">O que foi conversado</label>
          <textarea id="i-summary" name="summary" required />
        </div>
        <div className="field full">
          <label htmlFor="i-author">Quem registrou</label>
          <input id="i-author" name="author_name" />
        </div>
      </div>
    </FormDialog>
  );
}

export function Timeline({
  interactions,
  canEdit,
  visible = 4,
}: {
  interactions: InteractionRow[];
  canEdit: boolean;
  visible?: number;
}) {
  if (!interactions.length) return <p className="help">Nenhum contato registrado.</p>;
  const event = (i: InteractionRow) => (
    <div key={i.id} className="ev">
      <span className="d">{formatDate(i.occurred_on)}</span>
      <div>
        <span className="chip">{INTERACTION_KINDS[i.kind]}</span> {i.summary}
        {i.author_name && <span className="muted small"> · {i.author_name}</span>}
        {canEdit && (
          <ActionButton
            action={deleteInteraction.bind(null, i.id)}
            label="Excluir"
            confirm="Excluir este registro?"
            className="btn sm ghost danger"
          />
        )}
      </div>
    </div>
  );
  return (
    <>
      <div className="tl">{interactions.slice(0, visible).map(event)}</div>
      {interactions.length > visible && (
        <details className="more">
          <summary>Ver mais {interactions.length - visible} registro(s)</summary>
          <div className="in tl">{interactions.slice(visible).map(event)}</div>
        </details>
      )}
    </>
  );
}
