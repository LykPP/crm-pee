"use client";

import { FormDialog } from "@/components/form-dialog";
import type { CallRow, UtilityRow } from "@/lib/data/reference";
import type { FormState } from "@/lib/forms";
import { CALL_STATUS } from "@/lib/labels";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** Create or edit the basic data of a call; rules are not edited here. */
export function CallFormDialog({
  label,
  title,
  action,
  utilities,
  call,
  buttonClass,
}: {
  label: string;
  title: string;
  action: Action;
  utilities: Pick<UtilityRow, "id" | "name">[];
  call?: CallRow;
  buttonClass?: string;
}) {
  return (
    <FormDialog label={label} title={title} action={action} buttonClass={buttonClass}>
      <div className="fgrid">
        <div className="field">
          <label htmlFor="code">Código</label>
          <input id="code" name="code" required defaultValue={call?.code} placeholder="Ex.: CPP 001/2027" />
        </div>
        <div className="field">
          <label htmlFor="status">Situação</label>
          <select id="status" name="status" defaultValue={call?.status ?? "open"}>
            {Object.entries(CALL_STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="name">Nome completo</label>
          <input id="name" name="name" defaultValue={call?.name} />
        </div>
        <div className="field full">
          <label htmlFor="utility_id">Distribuidora</label>
          <select id="utility_id" name="utility_id" required defaultValue={call?.utility_id ?? ""}>
            <option value="" disabled>
              Escolha
            </option>
            {utilities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="published_on">Publicação</label>
          <input id="published_on" name="published_on" type="date" defaultValue={call?.published_on ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="submission_deadline">Prazo de submissão</label>
          <input
            id="submission_deadline"
            name="submission_deadline"
            type="date"
            defaultValue={call?.submission_deadline ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="total_budget">Recurso total (R$)</label>
          <input
            id="total_budget"
            name="total_budget"
            inputMode="decimal"
            defaultValue={call?.total_budget ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="clarification_email">E-mail para esclarecimentos</label>
          <input
            id="clarification_email"
            name="clarification_email"
            type="email"
            defaultValue={call?.clarification_email ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="call_url">Link do edital</label>
          <input id="call_url" name="call_url" type="url" defaultValue={call?.call_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="submission_url">Link de submissão</label>
          <input id="submission_url" name="submission_url" type="url" defaultValue={call?.submission_url ?? ""} />
        </div>
        <div className="field full">
          <label htmlFor="deadline_note">Nota sobre o prazo</label>
          <input id="deadline_note" name="deadline_note" defaultValue={call?.deadline_note ?? ""} />
        </div>
        <div className="field full">
          <label htmlFor="notes">Observações</label>
          <textarea id="notes" name="notes" defaultValue={call?.notes ?? ""} />
        </div>
      </div>
    </FormDialog>
  );
}
