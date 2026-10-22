import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { Compose } from "@/components/compose";
import { CallFormDialog } from "../call-form";
import { copyCall, deleteCall, updateCall } from "../actions";
import { getCall, listCallProjects, listUtilities } from "@/lib/data/reference";
import { brl, daysBetween, mi, nf, todayInBrazil } from "@/lib/pee";
import { APPLIES_TO_LABELS, LIMIT_LABELS, VALIDITY_LABELS, formatDate } from "@/lib/labels";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const CLARIFICATION_BODY = `Prezados,

Nome completo: [seu nome]
Empresa: [razão social da ESCO]
Documento do edital: [Regulamento / Especificação Técnica]
Item: [ex.: 9.3.6]

Dúvida:
[descreva a dúvida de forma objetiva]

Atenciosamente,`;

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role } = await requireMembership();
  const supabase = await createClient();
  const call = await getCall(supabase, id);
  if (!call) notFound();
  const [projects, utilities] = await Promise.all([listCallProjects(supabase, id), listUtilities(supabase)]);

  const r = call.rules;
  const today = todayInBrazil();
  const isOwn = call.org_id === org.id;
  const isAdmin = role === "admin";
  const t0 = r.typologies?.[0];
  const clarificationTo = call.clarification_email ?? call.utility?.pee_email;

  const essentials: [string, string][] = [
    [
      "Prazo para enviar",
      call.submission_deadline
        ? formatDate(call.submission_deadline) +
          (call.submission_deadline >= today ? ` · faltam ${daysBetween(today, call.submission_deadline)} dias` : "")
        : "A confirmar",
    ],
    ["Dinheiro disponível", call.total_budget ? mi(call.total_budget) : "—"],
    ["Valor por proposta", t0 ? `${mi(t0.min)} a ${mi(t0.max)}` : "—"],
    [
      "RCB máxima",
      r.maxBcr ? `${nf(r.maxBcr.fp)} fundo perdido · ${nf(r.maxBcr.cd)} contrato de desempenho` : "—",
    ],
  ];

  return (
    <div className="stack">
      <section className="box">
        <div className="sec">
          <div>
            <h2>
              {call.utility?.name} · {call.code}
            </h2>
            {call.deadline_note && (
              <p className="help" style={{ marginTop: 4 }}>
                {call.deadline_note}
              </p>
            )}
          </div>
          {isAdmin && isOwn && (
            <CallFormDialog
              label="Editar"
              title="Editar edital"
              action={updateCall.bind(null, call.id)}
              utilities={utilities}
              call={call}
              buttonClass="btn sm ghost"
            />
          )}
        </div>
        <div className="facts">
          {essentials.map(([l, v]) => (
            <div key={l} className="fact">
              <span className="l">{l}</span>
              <span className="v">{v}</span>
            </div>
          ))}
        </div>
        <div className="row">
          {call.submission_url && (
            <a className="btn pri" href={call.submission_url} target="_blank" rel="noopener">
              Abrir sistema de envio
            </a>
          )}
          {call.call_url && (
            <a className="btn" href={call.call_url} target="_blank" rel="noopener">
              Abrir edital
            </a>
          )}
          {clarificationTo && (
            <Compose
              label="Tirar uma dúvida"
              title="Pedido de esclarecimento"
              to={clarificationTo}
              subject={call.clarification_subject ?? `Esclarecimento ${call.code}`}
              body={CLARIFICATION_BODY}
            />
          )}
        </div>
        {call.notes && (
          <p className="small" style={{ color: "var(--ink-2)" }}>
            {call.notes}
          </p>
        )}
        {!r.checklist && (
          <div className="banner">
            As regras deste edital ainda não foram carregadas: prazos, limites e documentos exigidos.
          </div>
        )}
        {!call.rulesValid && (
          <div className="banner">
            As regras gravadas para este edital têm um erro de formato e foram ignoradas. Avise o
            suporte.
          </div>
        )}
        {!isOwn && (
          <p className="help">
            Edital de referência, mantido pela equipe do Painel PEE.
            {isAdmin && " Para ajustar algo só para a sua ESCO, faça uma cópia."}
          </p>
        )}
        {isAdmin && (
          <div className="row">
            {!isOwn && (
              <ActionButton
                action={copyCall.bind(null, call.id)}
                label="Copiar para a minha ESCO"
                pendingLabel="Copiando..."
                className="btn sm"
              />
            )}
            {isOwn && (
              <ActionButton
                action={deleteCall.bind(null, call.id)}
                label="Excluir edital"
                pendingLabel="Excluindo..."
                confirm="Excluir este edital da sua ESCO?"
                className="btn sm ghost danger"
              />
            )}
          </div>
        )}
      </section>

      {r.typologies && (
        <details className="more">
          <summary>
            <span>
              Tipologias e recursos
              <small>
                {r.typologies.length} tipologias · {projects.length} proposta(s) nossa(s)
              </small>
            </span>
          </summary>
          <div className="in">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipologia</th>
                    <th className="r">Recurso</th>
                    <th>Modalidade usual</th>
                    <th className="r">Nossas</th>
                  </tr>
                </thead>
                <tbody>
                  {r.typologies.map((t) => {
                    const ours = projects.filter((p) => p.typology === t.name).length;
                    return (
                      <tr key={t.name}>
                        <td>{t.name}</td>
                        <td className="r num">{mi(t.budget)}</td>
                        <td className="small">{t.modalityNote}</td>
                        <td className="r num">{ours || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {t0 && (
              <p className="help">
                Cada proposta vale de {mi(t0.min)} a {mi(t0.max)} em recursos do PEE.
              </p>
            )}
          </div>
        </details>
      )}

      {r.checklist && (
        <details className="more">
          <summary>
            <span>
              Documentos exigidos<small>{r.checklist.length} itens</small>
            </span>
          </summary>
          <div className="in">
            <p className="help">Os projetos ligados a este edital já recebem esta lista e marcam o que falta.</p>
            <div className="list">
              {r.checklist.map((it) => (
                <div key={it.id} className="item">
                  <div className="grow">
                    <div className="t">{it.name}</div>
                    <div className="s">
                      {APPLIES_TO_LABELS[it.appliesTo]}
                      {it.scope === "consumer_unit" && " · um por unidade consumidora"}
                      {it.validity && ` · ${VALIDITY_LABELS[it.validity]}`}
                      {it.optional && " · opcional"}
                    </div>
                    {it.hint && <div className="help">{it.hint}</div>}
                  </div>
                  <span className="muted small mono">{it.ref}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {r.rules && (
        <details className="more">
          <summary>
            <span>
              O que desclassifica<small>{r.rules.length} regras</small>
            </span>
          </summary>
          <div className="in">
            <div className="list">
              {r.rules.map((rule) => (
                <div key={rule.text} className="item">
                  <div className="grow">{rule.text}</div>
                  <span className="muted small mono">{rule.ref}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {(r.limits || r.maxBcr || r.avoidedCosts) && (
        <details className="more">
          <summary>Limites de custo e parâmetros de cálculo</summary>
          <div className="in">
            <div className="grid2">
              {r.limits && (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Rubrica</th>
                        <th className="r">Máximo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LIMIT_LABELS.map(([key, label]) => {
                        const c = r.limits?.[key as keyof typeof r.limits];
                        if (c == null) return null;
                        const pct = typeof c === "number" ? c : c.pct;
                        const cap = typeof c === "number" ? undefined : c.cap;
                        return (
                          <tr key={key}>
                            <td>{label}</td>
                            <td className="r num">
                              {nf(pct * 100, 1)}%{cap ? ` ou ${brl(cap)}` : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="tbl-wrap">
                <table>
                  <tbody>
                    {r.maxBcr && (
                      <>
                        <tr>
                          <td>RCB máx. fundo perdido</td>
                          <td className="r num">{nf(r.maxBcr.fp)}</td>
                        </tr>
                        <tr>
                          <td>RCB máx. contrato de desempenho</td>
                          <td className="r num">{nf(r.maxBcr.cd)}</td>
                        </tr>
                        {r.maxBcr.incentivizedOnly != null && (
                          <tr>
                            <td>RCB máx. só geração solar</td>
                            <td className="r num">{nf(r.maxBcr.incentivizedOnly)}</td>
                          </tr>
                        )}
                      </>
                    )}
                    {r.discountRate != null && (
                      <tr>
                        <td>Taxa de desconto</td>
                        <td className="r num">{nf(r.discountRate * 100, 0)}% a.a.</td>
                      </tr>
                    )}
                    {r.peakHours && (
                      <tr>
                        <td>Horário de ponta</td>
                        <td className="r">{r.peakHours}</td>
                      </tr>
                    )}
                    {r.executionPeriod && (
                      <tr>
                        <td>Prazo de execução</td>
                        <td className="r">{r.executionPeriod}</td>
                      </tr>
                    )}
                    {r.performanceContractReturn && (
                      <tr>
                        <td>Retorno do contrato de desempenho</td>
                        <td className="r">{r.performanceContractReturn}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {r.avoidedCosts && (
              <>
                <h4>Custos evitados por nível de tensão</h4>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nível</th>
                        <th>Tensão</th>
                        <th className="r">CEE R$/MWh</th>
                        <th className="r">CED R$/kW·ano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.avoidedCosts.map((c) => (
                        <tr key={c.level}>
                          <td className="mono">{c.level}</td>
                          <td>{c.description}</td>
                          <td className="r num">{nf(c.energyCost)}</td>
                          <td className="r num">{nf(c.demandCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </details>
      )}

      {r.scoring && (
        <details className="more">
          <summary>
            <span>
              Como as propostas são pontuadas
              <small>{r.scoring.reduce((s, x) => s + x.points, 0)} pontos</small>
            </span>
          </summary>
          <div className="in">
            <div className="tbl-wrap">
              <table>
                <tbody>
                  {r.scoring.map((x) => (
                    <tr key={x.item}>
                      <td className="mono">{x.item}</td>
                      <td>{x.criterion}</td>
                      <td className="r num">{x.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
