import Link from "next/link";
import {
  calcProject,
  documentRows,
  mi,
  nextStep,
  nf,
  projectIssues,
  summarizeDocuments,
  todayInBrazil,
} from "@/lib/pee";
import { loadProjectBundles } from "@/lib/data/projects";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Values the approved prototype shows for the example projects
 * (CLAUDE.md lists the first three; the fourth was computed with the
 * prototype's own code).
 */
const PROTOTYPE: Record<string, { pee: number; rcb: number; alerts: string[] }> = {
  "Hospital São Lucas · LED e climatização": {
    pee: 730107,
    rcb: 0.534,
    alerts: ["3 documento(s) fora da validade", "9 documento(s) faltando"],
  },
  "Vale do Sereno · Iluminação pública LED": {
    pee: 2704718,
    rcb: 0.432,
    alerts: ["16 documento(s) faltando"],
  },
  "Escolas Polo Monte Claro · LED e climatização": {
    pee: 636333,
    rcb: 0.663,
    alerts: ["1 documento(s) fora da validade"],
  },
  "Laticínios Serra Verde · motores e refrigeração": {
    pee: 341169,
    rcb: 0.608,
    alerts: ["21 documento(s) faltando"],
  },
};

function Match({ ok }: { ok: boolean }) {
  return <span className={`chip ${ok ? "ok" : "bad"}`}>{ok ? "Igual ao protótipo" : "Diferente"}</span>;
}

export default async function ConferencePage() {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const bundles = await loadProjectBundles(supabase, role);
  const today = todayInBrazil();

  return (
    <>
      <div className="head">
        <div>
          <h1>Conferência dos cálculos</h1>
          <p>Os números do sistema novo ao lado dos valores do protótipo aprovado.</p>
        </div>
        <Link href="/" className="btn">
          Voltar
        </Link>
      </div>

      <p className="msg warn">
        A RCB calculada é uma estimativa (PROPEE, módulo 7). A planilha oficial da distribuidora
        prevalece.
      </p>

      {!bundles.length && (
        <div className="empty">
          <b>Nenhum projeto ainda</b>
          <span>Carregue os dados de exemplo na tela Início para conferir os cálculos.</span>
        </div>
      )}

      {bundles.map((b) => {
        const ref = PROTOTYPE[b.project.name];
        const k = b.actions ? calcProject(b.project, b.call, b.actions, b.costs) : null;
        const docs = summarizeDocuments(documentRows(b.project, b.call, b.units, b.documents, today));
        const issues = projectIssues(b, bundles, today);
        const next = nextStep(b, bundles, today);
        const peeOk = ref && k ? Math.round(k.peeTotal) === ref.pee : false;
        const rcbOk = ref && k ? k.rcbPee.toFixed(3) === ref.rcb.toFixed(3) : false;
        const alertsOk = ref ? JSON.stringify(issues.map((i) => i.text)) === JSON.stringify(ref.alerts) : false;

        return (
          <section key={b.project.id} className="box">
            <h3>{b.project.name}</h3>
            <dl className="facts">
              {k ? (
                <>
                  <div>
                    <dt>Valor PEE</dt>
                    <dd className="num">{mi(k.peeTotal)}</dd>
                    {ref && (
                      <dd className="help">
                        Protótipo: {mi(ref.pee)} <Match ok={peeOk} />
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt>RCB</dt>
                    <dd className="num">
                      {nf(k.rcbPee, 3)}
                      {k.rcbMax != null && <span className="help"> limite {nf(k.rcbMax)}</span>}
                    </dd>
                    {ref && (
                      <dd className="help">
                        Protótipo: {nf(ref.rcb, 3)} <Match ok={rcbOk} />
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt>Limites por rubrica</dt>
                    <dd>
                      {k.checks.filter((c) => c.ok).length} de {k.checks.length} dentro do limite
                    </dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Valor PEE e RCB</dt>
                  <dd className="help">O seu papel não permite ver custos.</dd>
                </div>
              )}
              <div>
                <dt>Documentos</dt>
                <dd>
                  {docs.ok} de {docs.total} completos
                </dd>
              </div>
            </dl>
            <div>
              <h4>Alertas</h4>
              {issues.length ? (
                <ul className="issues">
                  {issues.map((i) => (
                    <li key={i.text} className={i.tone}>
                      {i.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="help">Nenhum alerta.</p>
              )}
              {ref && (
                <p className="help">
                  Comparação com o protótipo: <Match ok={alertsOk} />
                </p>
              )}
            </div>
            <p className="next">
              <b>Próximo passo:</b> {next.text}
            </p>
          </section>
        );
      })}
    </>
  );
}
