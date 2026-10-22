import { FormDialog } from "@/components/form-dialog";
import { formatDate } from "@/lib/labels";
import type { CallRules } from "@/lib/calls/rules-schema";
import { STEP_STATUS_LABELS, executionSteps, type ExecutionStep, type Project } from "@/lib/pee";
import { saveStep } from "../actions";

const DOT: Record<string, React.CSSProperties> = {
  done: { background: "var(--ok)" },
  in_progress: { background: "var(--warn)" },
  todo: { background: "var(--line-2)" },
};

export function ExecutionTab({
  project,
  steps,
  rules,
  canEdit,
}: {
  project: Project;
  steps: ExecutionStep[];
  rules: CallRules | null;
  canEdit: boolean;
}) {
  const list = executionSteps(project);
  const byKey = new Map(steps.map((s) => [s.step_key, s]));
  const done = list.filter(([key]) => byKey.get(key)?.status === "done").length;

  return (
    <>
      <section className="box">
        <div className="sec">
          <h3>Etapas da obra</h3>
          <span className="help">
            {done} de {list.length} concluídas
            {rules?.executionPeriod && ` · prazo de execução: ${rules.executionPeriod}`}
          </span>
        </div>
        <div className="tasks">
          {list.map(([key, label]) => {
            const s = byKey.get(key);
            const status = s?.status ?? "todo";
            return (
              <div key={key} className="task">
                <span className="dot" style={DOT[status]} />
                <div className="grow">
                  <div className="t">{label}</div>
                  <div className="s">
                    {STEP_STATUS_LABELS[status]}
                    {s?.started_on && ` · ${formatDate(s.started_on)}`}
                    {s?.finished_on && ` até ${formatDate(s.finished_on)}`}
                  </div>
                </div>
                {canEdit && (
                  <FormDialog
                    label="Atualizar"
                    title={label}
                    action={saveStep.bind(null, project.id, key)}
                    buttonClass="btn sm ghost"
                  >
                    <div className="fgrid">
                      <div className="field full">
                        <label htmlFor="st-status">Situação</label>
                        <select id="st-status" name="status" defaultValue={status}>
                          {Object.entries(STEP_STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="st-start">Início</label>
                        <input id="st-start" name="started_on" type="date" defaultValue={s?.started_on ?? ""} />
                      </div>
                      <div className="field">
                        <label htmlFor="st-end">Fim</label>
                        <input id="st-end" name="finished_on" type="date" defaultValue={s?.finished_on ?? ""} />
                      </div>
                    </div>
                  </FormDialog>
                )}
              </div>
            );
          })}
        </div>
        <p className="help">
          O reembolso de cada etapa só sai depois de concluída e aprovada, com recibo assinado e três
          orçamentos ou licitação.
        </p>
      </section>
      {rules?.minPhotos && (
        <details className="more">
          <summary>Fotos mínimas por etapa</summary>
          <div className="in">
            <div className="tbl-wrap">
              <table>
                <tbody>
                  {rules.minPhotos.map((f) => (
                    <tr key={f.stage}>
                      <td>{f.stage}</td>
                      <td className="r num">{f.count} fotos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="help">Fotos nítidas de 10 MP e 300 dpi, em JPEG, identificadas e sem repetição.</p>
          </div>
        </details>
      )}
    </>
  );
}
