import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import {
  COST_FIELDS,
  END_USES,
  brl,
  feasibility,
  mi,
  nf,
  type CalcResult,
  type EfficiencyAction,
  type ProjectBundle,
  type ProjectCosts,
} from "@/lib/pee";
import { addAction, deleteAction, saveCosts, updateAction } from "../actions";

type StoredAction = EfficiencyAction & { id: string };

const num = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

function ActionFields({ action }: { action?: StoredAction }) {
  const field = (
    name: keyof EfficiencyAction,
    label: string,
    hint?: string,
    fallback?: number,
  ) => (
    <div className="field">
      <label htmlFor={`ac-${name}`}>{label}</label>
      <input
        id={`ac-${name}`}
        name={name}
        inputMode="decimal"
        required={!name.endsWith("override")}
        defaultValue={action ? num(action[name] as number | null) : fallback != null ? String(fallback) : ""}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
  return (
    <div className="fgrid">
      <div className="field">
        <label htmlFor="ac-end_use">Uso final</label>
        <select id="ac-end_use" name="end_use" defaultValue={action?.end_use ?? "Iluminação"}>
          {END_USES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ac-description">Descrição</label>
        <input id="ac-description" name="description" defaultValue={action?.description ?? ""} />
        <span className="hint">Ex.: fluorescente T8 2x32 W → LED tubular 18 W</span>
      </div>
      {field("quantity", "Quantidade")}
      {field("useful_life_years", "Vida útil (anos)", "Anexo B da ET; iluminação no máximo 15", 15)}
      {field("power_before_w", "Potência antes por unidade (W)", "Inclua as perdas do reator")}
      {field("power_after_w", "Potência depois por unidade (W)")}
      {field("hours_per_year", "Horas de uso por ano")}
      {field("unit_cost", "Custo unitário (R$)", "Material e equipamento")}
      {field("peak_hours_per_day", "Horas por dia na ponta (nup)", "Até 3 (17h às 20h)")}
      {field("peak_days_per_month", "Dias úteis por mês na ponta (nd)", undefined, 22)}
      {field("months_per_year", "Meses de uso por ano (nm)", undefined, 12)}
      {field(
        "energy_saved_mwh_override",
        "Energia economizada manual (MWh/ano)",
        "Opcional, para FV, aquecimento solar ou cálculos próprios",
      )}
      {field("peak_reduction_kw_override", "Redução na ponta manual (kW)", "Opcional")}
    </div>
  );
}

function CostsDialog({
  projectId,
  costs,
  label,
  buttonClass,
}: {
  projectId: string;
  costs: ProjectCosts | null | undefined;
  label: string;
  buttonClass: string;
}) {
  return (
    <FormDialog
      label={label}
      title="Custos por rubrica (R$)"
      action={saveCosts.bind(null, projectId)}
      buttonClass={buttonClass}
    >
      <div className="fgrid">
        {COST_FIELDS.map(([key, l]) => (
          <div key={key} className="field">
            <label htmlFor={`cost-${key}`}>{l}</label>
            <input id={`cost-${key}`} name={key} inputMode="decimal" defaultValue={num(costs?.[key] ?? null)} />
          </div>
        ))}
      </div>
    </FormDialog>
  );
}

function verdictText(k: CalcResult, tone: string) {
  const limit = k.rcbMax != null ? nf(k.rcbMax) : "do edital";
  if (tone === "ok") return `Projeto viável: a RCB está abaixo do limite de ${limit} e os custos respeitam o edital.`;
  if (k.rcbMax != null && k.rcbPee > k.rcbMax) {
    return `RCB acima do limite de ${limit}. Reduza custos ou aumente a economia.`;
  }
  return "A RCB está boa, mas há custos fora dos limites do edital.";
}

export function ViabilityTab({
  bundle,
  k,
  canEdit,
  voltageLevel,
  discountRate,
}: {
  bundle: ProjectBundle;
  k: CalcResult;
  canEdit: boolean;
  voltageLevel: string | null;
  discountRate: number;
}) {
  const projectId = bundle.project.id;
  const actions = (bundle.actions ?? []) as StoredAction[];
  const has = actions.length > 0 && Number.isFinite(k.rcbPee);
  const verdict = feasibility(bundle);
  const fails = k.checks.filter((c) => !c.ok);
  const typologyBad = k.typology && (k.peeTotal < k.typology.min || k.peeTotal > k.typology.max);
  const gaugeMax = Math.max(1.2, (k.rcbMax ?? 0) * 1.4);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / gaugeMax) * 100));
  const usesAbove = k.byEndUse.filter((u) => k.rcbMax != null && u.rcb > k.rcbMax);

  return (
    <>
      <div className={`verdict ${has ? verdict.tone : "na"}`}>
        <div className="big num">{has ? nf(k.rcbPee) : "—"}</div>
        <div className="grow">
          <b>{has ? verdictText(k, verdict.tone) : "Cadastre as ações de eficiência para calcular a RCB."}</b>
          <span className="help">
            RCB é quanto o projeto custa por ano dividido pelo benefício anual para o sistema elétrico.
            Quanto menor, melhor. Estimativa pelo PROPEE; a planilha oficial da distribuidora prevalece.
          </span>
          {has && k.rcbMax != null && (
            <div className="gauge" aria-label={`RCB ${nf(k.rcbPee)}, limite ${nf(k.rcbMax)}`}>
              <span
                className="fill"
                style={{ width: `${pct(k.rcbPee)}%`, background: k.rcbPee > k.rcbMax ? "var(--bad)" : "var(--ok)" }}
              />
              <b style={{ left: `${pct(k.rcbMax)}%` }} title="limite" />
            </div>
          )}
        </div>
      </div>

      {(fails.length > 0 || typologyBad || usesAbove.length > 0) && (
        <section className="box">
          <h3>Ajustes necessários</h3>
          <div className="tasks">
            {typologyBad && k.typology && (
              <div className="task">
                <span className="dot bad" />
                <div className="grow">
                  <div className="t">Valor do PEE fora da faixa da tipologia</div>
                  <div className="s">
                    {brl(k.peeTotal)} · permitido de {mi(k.typology.min)} a {mi(k.typology.max)}
                  </div>
                </div>
              </div>
            )}
            {fails.map((c) => (
              <div key={c.name} className="task">
                <span className="dot bad" />
                <div className="grow">
                  <div className="t">{c.name} acima do limite</div>
                  <div className="s">
                    {brl(c.value)} · máximo {brl(c.max)}
                  </div>
                </div>
                {canEdit && (
                  <CostsDialog projectId={projectId} costs={bundle.costs} label="Ajustar" buttonClass="btn sm" />
                )}
              </div>
            ))}
            {k.rcbPee <= (k.rcbMax ?? Infinity) &&
              usesAbove.map((u) => (
                <div key={u.endUse} className="task">
                  <span className="dot warn" />
                  <div className="grow">
                    <div className="t">
                      RCB de {u.endUse} acima do limite ({nf(u.rcb)})
                    </div>
                    <div className="s">
                      O projeto é permitido, mas a planilha da distribuidora aponta este uso final. Se
                      houver fonte incentivada, a ET exige comprovar a inviabilidade por uso final.
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="box">
        <div className="sec">
          <h3>Ações de eficiência</h3>
          {canEdit && (
            <FormDialog
              label="Adicionar ação"
              title="Adicionar ação"
              action={addAction.bind(null, projectId)}
              buttonClass="btn pri sm"
            >
              <ActionFields />
            </FormDialog>
          )}
        </div>
        {actions.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ação</th>
                  <th className="r">Quantidade</th>
                  <th className="r">Economia por ano</th>
                  <th className="r">Custo</th>
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {k.actions.map((a, i) => (
                  <tr key={actions[i].id}>
                    <td>
                      <b>{a.end_use}</b>
                      {a.description && <div className="small muted">{a.description}</div>}
                    </td>
                    <td className="r num">{nf(Number(a.quantity), 0)}</td>
                    <td className="r num">{nf(a.energySavedMwh, 1)} MWh</td>
                    <td className="r num">{brl(a.cost)}</td>
                    {canEdit && (
                      <td className="r">
                        <FormDialog
                          label="Editar"
                          title="Editar ação"
                          action={updateAction.bind(null, projectId, actions[i].id)}
                          buttonClass="btn sm ghost"
                          extraFooter={
                            <ActionButton
                              action={deleteAction.bind(null, projectId, actions[i].id)}
                              label="Remover"
                              confirm="Remover esta ação?"
                              className="btn danger"
                            />
                          }
                        >
                          <ActionFields action={actions[i]} />
                        </FormDialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Nenhuma ação cadastrada</b>
            <span>Adicione as trocas de equipamento levantadas na visita.</span>
          </div>
        )}
      </section>

      {k.byEndUse.length > 1 && (
        <section className="box">
          <h3>RCB por uso final</h3>
          <p className="help">Como na aba RCB da planilha oficial da distribuidora.</p>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Uso final</th>
                  <th className="r">Energia</th>
                  <th className="r">Ponta</th>
                  <th className="r">RCB</th>
                </tr>
              </thead>
              <tbody>
                {k.byEndUse.map((u) => (
                  <tr key={u.endUse}>
                    <td>{u.endUse}</td>
                    <td className="r num">{nf(u.energySavedMwh, 1)} MWh</td>
                    <td className="r num">{nf(u.peakReductionKw, 1)} kW</td>
                    <td
                      className="r num"
                      style={k.rcbMax != null && u.rcb > k.rcbMax ? { color: "var(--warn)" } : undefined}
                    >
                      {nf(u.rcb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="box">
        <div className="sec">
          <h3>Resumo dos custos</h3>
          {canEdit && (
            <CostsDialog projectId={projectId} costs={bundle.costs} label="Editar custos" buttonClass="btn sm" />
          )}
        </div>
        <div className="facts">
          <div className="fact">
            <span className="l">Equipamentos</span>
            <span className="v num">{brl(k.equipment)}</span>
          </div>
          <div className="fact">
            <span className="l">Serviços e demais rubricas</span>
            <span className="v num">
              {brl(k.thirdPartyLabor + k.marketing + k.training + k.disposal + k.measurementVerification)}
            </span>
          </div>
          <div className="fact">
            <span className="l">Custos da distribuidora</span>
            <span className="v num">{brl(k.mop + k.admp + k.audit)}</span>
          </div>
          <div className="fact">
            <span className="l">Total pago pelo PEE</span>
            <span className="v num">
              <b>{brl(k.peeTotal)}</b>
            </span>
          </div>
        </div>
      </section>

      <details className="more">
        <summary>
          <span>
            Detalhes do cálculo<small>parâmetros, rubricas e limites</small>
          </span>
        </summary>
        <div className="in">
          <p className="help">
            Nível {voltageLevel || "—"}: CEE {nf(k.avoidedCost.energyCost)} R$/MWh · CED{" "}
            {nf(k.avoidedCost.demandCost)} R$/kW·ano · taxa {nf(discountRate * 100, 0)}% a.a. · RCB total com
            contrapartida {Number.isFinite(k.rcbTotal) ? nf(k.rcbTotal) : "—"}
          </p>
          {k.actions.length > 0 && (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th className="r">W antes → depois</th>
                    <th className="r">h/ano</th>
                    <th className="r">FCP</th>
                    <th className="r">Vida</th>
                    <th className="r">Redução ponta</th>
                    <th className="r">Benefício/ano</th>
                  </tr>
                </thead>
                <tbody>
                  {k.actions.map((a, i) => (
                    <tr key={actions[i].id}>
                      <td>{a.end_use}</td>
                      <td className="r num">
                        {nf(Number(a.power_before_w), 0)} → {nf(Number(a.power_after_w), 0)}
                      </td>
                      <td className="r num">{nf(Number(a.hours_per_year), 0)}</td>
                      <td className="r num">{nf(a.coincidenceFactor)}</td>
                      <td className="r num" style={{ whiteSpace: "nowrap" }}>
                        {Number(a.useful_life_years)} anos
                      </td>
                      <td className="r num">{nf(a.peakReductionKw, 1)} kW</td>
                      <td className="r num">{brl(a.benefit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid2">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rubrica</th>
                    <th className="r">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Materiais e equipamentos", k.equipment],
                      ["Mão de obra de terceiros", k.thirdPartyLabor],
                      ["Marketing", k.marketing],
                      ["Treinamento", k.training],
                      ["Descarte", k.disposal],
                      ["Medição e verificação", k.measurementVerification],
                      ["Mão de obra própria da distribuidora", k.mop],
                      ["Administração própria", k.admp],
                      ["Auditoria contábil e financeira", k.audit],
                      ["Contrapartida", k.counterpart],
                    ] as [string, number][]
                  ).map(([l, v]) => (
                    <tr key={l}>
                      <td>{l}</td>
                      <td className="r num">{brl(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Limite</th>
                    <th className="r">Usado / máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {k.checks.map((c) => (
                    <tr key={c.name}>
                      <td>
                        {c.name}
                        <div className="small muted mono">{c.ref}</div>
                      </td>
                      <td className="r num" style={{ color: c.ok ? "inherit" : "var(--bad)" }}>
                        {mi(c.value)} / {mi(c.max)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
