import { clearNextAction, setNextAction } from "@/lib/actions/next-action";
import { formatDate } from "@/lib/labels";
import { addDays } from "@/lib/pee";
import { ActionButton } from "./action-button";
import { FormDialog } from "./form-dialog";

/** The highlighted "Próxima ação" box of a client or project. */
export function NextActionBox({
  table,
  id,
  date,
  text,
  today,
  canEdit,
}: {
  table: "clients" | "projects";
  id: string;
  date: string | null;
  text: string | null;
  today: string;
  canEdit: boolean;
}) {
  const late = Boolean(date && date < today);
  return (
    <div className={`nextbox${late ? " late" : ""}`}>
      <div className="grow">
        <div className="l">Próxima ação</div>
        <div className="t">{text || "Nenhuma ação definida"}</div>
        {date && (
          <div className="small">
            {formatDate(date)}
            {late && " · atrasada"}
          </div>
        )}
      </div>
      {canEdit && (
        <FormDialog
          label={text ? "Alterar" : "Definir"}
          title="Próxima ação"
          action={setNextAction.bind(null, table, id)}
          buttonClass="btn sm"
          extraFooter={
            text ? (
              <ActionButton
                action={clearNextAction.bind(null, table, id)}
                label="Marcar como feita"
                className="btn"
              />
            ) : undefined
          }
        >
          <div className="fgrid">
            <div className="field">
              <label htmlFor="na-date">Data</label>
              <input
                id="na-date"
                name="next_action_on"
                type="date"
                required
                defaultValue={date ?? addDays(today, 3)}
              />
            </div>
            <div className="field full">
              <label htmlFor="na-text">O que fazer</label>
              <input id="na-text" name="next_action" required defaultValue={text ?? ""} />
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
