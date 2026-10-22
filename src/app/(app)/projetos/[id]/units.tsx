import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import type { ConsumerUnit } from "@/lib/pee";
import { addUnit, deleteUnit, updateUnit } from "../actions";

function UnitFields({ unit }: { unit?: ConsumerUnit }) {
  return (
    <div className="fgrid">
      <div className="field full">
        <label htmlFor="uc-number">Número da instalação / UC</label>
        <input id="uc-number" name="number" required defaultValue={unit?.number} inputMode="numeric" />
      </div>
      <div className="field full">
        <label htmlFor="uc-desc">Descrição</label>
        <input id="uc-desc" name="description" defaultValue={unit?.description ?? ""} />
        <span className="hint">Ex.: prédio principal</span>
      </div>
    </div>
  );
}

export function UnitsSection({
  projectId,
  units,
  canEdit,
}: {
  projectId: string;
  units: ConsumerUnit[];
  canEdit: boolean;
}) {
  return (
    <section className="box">
      <div className="sec">
        <h3>Unidades consumidoras</h3>
        {canEdit && (
          <FormDialog
            label="Adicionar"
            title="Adicionar UC"
            action={addUnit.bind(null, projectId)}
            buttonClass="btn sm ghost"
          >
            <UnitFields />
          </FormDialog>
        )}
      </div>
      {units.length ? (
        <div className="list">
          {units.map((u) => (
            <div key={u.id} className="item">
              <div className="grow">
                <div className="t mono">{u.number}</div>
                {u.description && <div className="s">{u.description}</div>}
              </div>
              {canEdit && (
                <FormDialog
                  label="Editar"
                  title="Editar UC"
                  action={updateUnit.bind(null, projectId, u.id)}
                  buttonClass="btn sm ghost"
                  extraFooter={
                    <ActionButton
                      action={deleteUnit.bind(null, projectId, u.id)}
                      label="Remover"
                      confirm={`Remover a UC ${u.number}? Os documentos dela também saem do projeto.`}
                      className="btn danger"
                    />
                  }
                >
                  <UnitFields unit={u} />
                </FormDialog>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="help">Cadastre as UCs. Fatura e fotos são cobradas para cada uma.</p>
      )}
    </section>
  );
}
