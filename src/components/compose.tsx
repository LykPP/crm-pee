"use client";

import { useState } from "react";
import { whatsappUrl } from "@/lib/labels";
import { CopyButton } from "./copy-button";
import { Dialog } from "./dialog";

/** Drafts a message to copy into e-mail or WhatsApp, like the prototype. */
export function Compose({
  label,
  title,
  to,
  subject = "",
  body = "",
  phone,
  buttonClass,
}: {
  label: string;
  title: string;
  to?: string | null;
  subject?: string;
  body?: string;
  phone?: string | null;
  buttonClass?: string;
}) {
  return (
    <Dialog label={label} title={title} buttonClass={buttonClass}>
      <ComposeBody to={to} subject={subject} body={body} phone={phone} />
    </Dialog>
  );
}

function ComposeBody({
  to,
  subject: initialSubject,
  body: initialBody,
  phone,
}: {
  to?: string | null;
  subject: string;
  body: string;
  phone?: string | null;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const mailto = `mailto:${encodeURIComponent(to ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <>
      <div className="body">
        <div className="field">
          <label>Para</label>
          <div className="row">
            <span className="copyable">{to || "(sem e-mail cadastrado)"}</span>
            {to && <CopyButton text={to} />}
          </div>
        </div>
        <div className="field">
          <label htmlFor="compose-subject">Assunto</label>
          <input id="compose-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="compose-body">Mensagem</label>
          <textarea
            id="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: 240 }}
          />
        </div>
        <p className="help">
          Copie o texto para o seu e-mail ou WhatsApp. Os botões de abrir podem não funcionar em
          todos os navegadores.
        </p>
      </div>
      <footer>
        {phone && (
          <a className="btn" href={whatsappUrl(phone, body)} target="_blank" rel="noopener">
            Abrir no WhatsApp
          </a>
        )}
        <a className="btn" href={mailto}>
          Abrir no app de e-mail
        </a>
        <CopyButton text={`${subject}\n\n${body}`} label="Copiar assunto e texto" />
      </footer>
    </>
  );
}
