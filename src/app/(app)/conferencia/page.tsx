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
 * Reference values for the example projects. The first three come from
 * Cemig's official RCB workbook (scripts/check-official-rcb.py); the dairy
 * project uses motors, which that workbook models with data the prototype
 * does not hold, so its reference is the prototype plus the R$ 1.500 audit.
 * Alerts are the prototype's, plus the per end use warnings of the workbook.
 */
const REFERENCE: Record<string, { source: string; pee: number; rcb: number; alerts: string[] }> = {
  "Hospital São Lucas · LED e climatização": {
    source: "Planilha Cemig",
    pee: 731607,
    rcb: 0.535,
    alerts: [
      "3 documento(s) fora da validade",
      "9 documento(s) faltando",
      "RCB de Climatização 0,94 acima do limite 0,75",
    ],
  },
  "Vale do Sereno · Iluminação pública LED": {
    source: "Planilha Cemig",
    pee: 2706218,
    rcb: 0.433,
    alerts: ["16 documento(s) faltando"],
  },
  "Escolas Polo Monte Claro · LED e climatização": {
    source: "Planilha Cemig",
    pee: 637833,
    rcb: 0.665,
    alerts: ["1 documento(s) fora da validade", "RCB de Climatização 1,95 acima do limite 0,75"],
  },
  "Laticínios Serra Verde · motores e refrigeração": {
    source: "Protótipo + auditoria",
    pee: 342669,
    rcb: 0.61,
    alerts: ["21 documento(s) faltando"],
  },
};

function Match({ ok }: { ok: boolean }) {
  return <span className={`chip ${ok ? "ok" : "bad"}`}>{ok ? "Igual" : "Diferente"}</span>;
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
          <p>Os números do sistema ao lado da planilha oficial de RCB da Cemig.</p>
        </div>
        <Link href="/" className="btn">
          Voltar
        </Link>
      </div>

      <p className="msg warn">
        A RCB calculada é uma estimativa (PROPEE, módulo 7). A planilha oficial da distribuidora
        prevalece.
      </p>
      <p className="help">
        Os três primeiros exemplos foram calculados na planilha oficial da Cemig (CPP 001/2026, rev.
        01). O de motores usa o protótipo aprovado mais a auditoria de R$ 1.500 exigida pela
        Especificação Técnica (item 5.16.1).
      </p>

      {!bundles.length && (
        <div className="empty">
          <b>Nenhum projeto ainda</b>
          <span>Carregue os dados de exemplo na tela Início para conferir os cálculos.</span>
        </div>
      )}

      {bundles.map((b) => {
        const ref = REFERENCE[b.project.name];
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
            <div className="facts">
              {k ? (
                <>
                  <div className="fact">
                    <span className="l">Valor PEE</span>
                    <span className="v big num">{mi(k.peeTotal)}</span>
                    {ref && (
                      <span className="help">
                        {ref.source}: {mi(ref.pee)} <Match ok={peeOk} />
                      </span>
                    )}
                  </div>
                  <div className="fact">
                    <span className="l">RCB</span>
                    <span className="v big num">
                      {nf(k.rcbPee, 3)}
                      {k.rcbMax != null && <span className="help"> limite {nf(k.rcbMax)}</span>}
                    </span>
                    {ref && (
                      <span className="help">
                        {ref.source}: {nf(ref.rcb, 3)} <Match ok={rcbOk} />
                      </span>
                    )}
                  </div>
                  <div className="fact">
                    <span className="l">Limites por rubrica</span>
                    <span className="v">
                      {k.checks.filter((c) => c.ok).length} de {k.checks.length} dentro do limite
                    </span>
                  </div>
                </>
              ) : (
                <div className="fact">
                  <span className="l">Valor PEE e RCB</span>
                  <span className="help">O seu papel não permite ver custos.</span>
                </div>
              )}
              <div className="fact">
                <span className="l">Documentos</span>
                <span className="v">
                  {docs.ok} de {docs.total} completos
                </span>
              </div>
            </div>
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
                  Comparação com a referência: <Match ok={alertsOk} />
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
