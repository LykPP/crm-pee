"use client";

import { FormDialog } from "@/components/form-dialog";
import { CLIENT_STATUS, type ClientRow } from "@/lib/data/clients";
import type { FormState } from "@/lib/forms";
import { MODALITY_LABELS } from "@/lib/messages";

export function ClientFormDialog({
  label,
  title,
  action,
  client,
  utilities,
  typologies,
  defaultUtilityId,
  buttonClass,
}: {
  label: string;
  title: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  client?: ClientRow;
  utilities: { id: string; name: string }[];
  typologies: string[];
  defaultUtilityId?: string;
  buttonClass?: string;
}) {
  return (
    <FormDialog label={label} title={title} action={action} buttonClass={buttonClass}>
      <div className="fgrid">
        <div className="field full">
          <label htmlFor="cl-name">Nome</label>
          <input id="cl-name" name="name" required defaultValue={client?.name} />
        </div>
        <div className="field">
          <label htmlFor="cl-kind">Tipo de instituição</label>
          <input id="cl-kind" name="kind" defaultValue={client?.kind ?? ""} />
          <span className="hint">Ex.: hospital filantrópico, prefeitura, indústria</span>
        </div>
        <div className="field">
          <label htmlFor="cl-cnpj">CNPJ</label>
          <input id="cl-cnpj" name="cnpj" defaultValue={client?.cnpj ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="cl-mun">Município</label>
          <input id="cl-mun" name="municipality" defaultValue={client?.municipality ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="cl-uf">UF</label>
          <input id="cl-uf" name="state" maxLength={2} defaultValue={client?.state ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="cl-util">Distribuidora</label>
          <select id="cl-util" name="utility_id" defaultValue={client ? (client.utility_id ?? "") : (defaultUtilityId ?? "")}>
            <option value="">—</option>
            {utilities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cl-typ">Tipologia provável</label>
          <select id="cl-typ" name="typology" defaultValue={client?.typology ?? ""}>
            <option value="">—</option>
            {typologies.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cl-mod">Modalidade</label>
          <select id="cl-mod" name="modality" defaultValue={client ? (client.modality ?? "") : "fp"}>
            <option value="">—</option>
            {Object.entries(MODALITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cl-status">Status</label>
          <select id="cl-status" name="status" defaultValue={client?.status ?? "lead"}>
            {Object.entries(CLIENT_STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="cl-notes">Observações</label>
          <textarea id="cl-notes" name="notes" defaultValue={client?.notes ?? ""} />
        </div>
      </div>
    </FormDialog>
  );
}
