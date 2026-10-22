import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { NextActionFact } from "@/components/next-action";
import { TabsNav } from "@/components/tabs-nav";
import { InteractionDialog, Timeline } from "@/components/people";
import { ProjectFormDialog } from "../project-form";
import { StageSelect } from "../stage-select";
import { deleteProject, setFolder, setStage, updateProject } from "../actions";
import { DocumentsTab } from "./documents-tab";
import { UnitsSection } from "./units";
import { ExecutionTab } from "./execution-tab";
import { ViabilityTab } from "./viability-tab";
import { listClients } from "@/lib/data/clients";
import { projectFormOptions } from "@/lib/data/project-options";
import { CAN_SEE_COSTS, listExecutionSteps, loadProjectBundles } from "@/lib/data/projects";
import { listCalls, listContacts, listInteractions, shortCallCode } from "@/lib/data/reference";
import { MODALITY_LABELS, clientMessage } from "@/lib/messages";
import {
  PHASES,
  calcProject,
  documentRows,
  feasibility,
  folderTree,
  mi,
  nextStep,
  nf,
  phaseIndex,
  projectIssues,
  summarizeDocuments,
  todayInBrazil,
  type IssueArea,
} from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  ["visao", "Visão geral"],
  ["documentos", "Documentos"],
  ["viabilidade", "Viabilidade"],
  ["execucao", "Execução"],
] as const;
type Tab = (typeof TABS)[number][0];

const TAB_FOR_AREA: Record<IssueArea, Tab> = {
  docs: "documentos",
  rcb: "viabilidade",
  conflicts: "visao",
};


export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; filtro?: string }>;
}) {
  const { id } = await params;
  const { aba, filtro } = await searchParams;
  const tab: Tab = TABS.some(([t]) => t === aba) ? (aba as Tab) : "visao";
  const { role } = await requireMembership();
  const supabase = await createClient();
  const [bundles, clients, calls] = await Promise.all([
    loadProjectBundles(supabase, role),
    listClients(supabase),
    listCalls(supabase),
  ]);
  const bundle = bundles.find((b) => b.project.id === id);
  if (!bundle) notFound();

  const { project: p } = bundle;
  const client = clients.find((c) => c.id === p.client_id);
  const call = calls.find((c) => c.id === p.call_id);
  const [interactions, contacts, steps] = await Promise.all([
    listInteractions(supabase, { column: "client_id", id: p.client_id }),
    listContacts(supabase, { column: "client_id", id: p.client_id }),
    tab === "execucao" ? listExecutionSteps(supabase, id) : Promise.resolve([]),
  ]);
  const contact = contacts.find((c) => c.is_primary) ?? contacts[0];
  const today = todayInBrazil();
  const href = (t: Tab) => `/projetos/${id}${t === "visao" ? "" : `?aba=${t}`}`;

  const canEdit = role !== "viewer";
  const canEditDetails = CAN_SEE_COSTS.includes(role);
  const docRows = documentRows(p, bundle.call, bundle.units, bundle.documents, today);
  const docs = summarizeDocuments(docRows);
  const issues = projectIssues(bundle, bundles, today);
  const next = nextStep(bundle, bundles, today);
  const verdict = feasibility(bundle);
  const k = bundle.actions ? calcProject(p, bundle.call, bundle.actions, bundle.costs) : null;
  const hasActions = Boolean(bundle.actions?.length);
  const phase = phaseIndex(p.stage);
  const flags = [
    p.is_micro_small_business && "ME/EPP",
    p.has_non_removable_uses && "Usos não removíveis",
    p.is_heritage_listed && "Imóvel tombado",
    p.has_incentivized_source && "Geração solar",
    p.requires_public_bidding && "Exige licitação",
  ].filter(Boolean) as string[];

  return (
    <>
      <div>
        <Link href="/projetos" className="btn ghost sm">
          ← Projetos
        </Link>
      </div>
      <div className="head" style={{ marginTop: -16 }}>
        <div>
          <h1>
            {p.name} {p.is_example && <span className="chip ex">exemplo</span>}
          </h1>
          <p>
            {client?.name}
            {call && ` · ${call.utility?.short_name ?? ""} ${shortCallCode(call)}`}
          </p>
        </div>
        <StageSelect stage={p.stage} action={setStage.bind(null, id)} disabled={!canEdit} />
      </div>

      <div className="stepper" aria-label={`Fase ${phase + 1} de ${PHASES.length}`}>
        {PHASES.map((ph, i) => (
          <div key={ph.name} className={i < phase ? "done" : i === phase ? "cur" : ""}>
            <i />
            <span>{ph.name}</span>
          </div>
        ))}
      </div>

      {next.text && (
        <div className="nextbox">
          <div className="grow">
            <div className="l">Próximo passo</div>
            <div className="t">{next.text}</div>
            {next.more > 0 && <div className="small">e mais {next.more} problema(s) para resolver</div>}
          </div>
          {next.area && (
            <Link className="btn pri" href={href(TAB_FOR_AREA[next.area])} scroll={false}>
              Resolver
            </Link>
          )}
        </div>
      )}

      <div className="tiles">
        <Link className="tile" href={href("documentos")} scroll={false}>
          <span className="l">Documentos</span>
          <span className="v">
            {docs.ok} de {docs.total}
          </span>
          <span className="bar">
            <i className="ok" style={{ width: `${docs.pct * 100}%` }} />
            <i className="bad" style={{ width: `${docs.total ? (docs.expired / docs.total) * 100 : 0}%` }} />
          </span>
          <span className="s">
            {docs.missing ? `${docs.missing} faltando` : "nada faltando"}
            {docs.expired ? ` · ${docs.expired} vencido(s)` : ""}
          </span>
        </Link>
        {k ? (
          <>
            <Link className="tile" href={href("viabilidade")} scroll={false}>
              <span className="l">Viabilidade</span>
              <span
                className="v"
                style={{ color: verdict.tone === "ok" ? "var(--ok)" : verdict.tone === "bad" ? "var(--bad)" : undefined }}
              >
                {verdict.label}
              </span>
              <span className="s">
                {Number.isFinite(k.rcbPee)
                  ? `RCB ${nf(k.rcbPee)}${k.rcbMax != null ? ` (limite ${nf(k.rcbMax)})` : ""}`
                  : "cadastre as ações"}
              </span>
            </Link>
            <Link className="tile" href={href("viabilidade")} scroll={false}>
              <span className="l">Investimento do PEE</span>
              <span className="v">{hasActions ? mi(k.peeTotal) : "—"}</span>
              <span className="s">
                {hasActions ? `economia de ${nf(k.energySavedMwh, 0)} MWh por ano` : "sem ações cadastradas"}
              </span>
            </Link>
          </>
        ) : (
          <div className="tile">
            <span className="l">Viabilidade e investimento</span>
            <span className="s">O seu papel não permite ver custos.</span>
          </div>
        )}
      </div>

      <TabsNav
        label="Seções do projeto"
        current={tab}
        tabs={TABS.map(([t, label]) => ({ key: t, label, href: href(t) }))}
      />

      {tab === "documentos" ? (
        <DocumentsTab
          projectId={id}
          rows={docRows}
          hasChecklist={Boolean(bundle.call?.rules.checklist)}
          deadline={bundle.call?.submission_deadline ?? null}
          showAll={filtro === "todos"}
          canEdit={canEditDetails}
          contact={contact}
          message={clientMessage("documents", {
            client: {
              name: client?.name ?? "",
              municipality: client?.municipality ?? null,
              typology: client?.typology ?? null,
              modality: client?.modality ?? null,
            },
            contactName: contact?.name,
            project: bundle,
            call: call && {
              code: call.code,
              submission_deadline: call.submission_deadline,
              utilityName: call.utility?.name ?? null,
            },
            today,
          })}
        />
      ) : tab === "viabilidade" ? (
        k ? (
          <ViabilityTab
            bundle={bundle}
            k={k}
            canEdit={canEditDetails}
            voltageLevel={p.voltage_level}
            discountRate={bundle.call?.rules.discountRate ?? 0.08}
          />
        ) : (
          <div className="box">
            <p className="help">O seu papel não permite ver custos e ações de eficiência.</p>
          </div>
        )
      ) : tab === "execucao" ? (
        <ExecutionTab
          project={p}
          steps={steps}
          rules={bundle.call?.rules ?? null}
          canEdit={canEditDetails}
        />
      ) : (
        <>
          {issues.length > 0 && (
            <section className="box">
              <h3>Problemas encontrados</h3>
              <div className="tasks">
                {issues.map((i) => (
                  <div key={i.text} className="task">
                    <span className={`dot ${i.tone}`} />
                    <div className="grow t">{i.text}</div>
                    {TAB_FOR_AREA[i.area] !== "visao" && (
                      <Link className="btn sm" href={href(TAB_FOR_AREA[i.area])} scroll={false}>
                        Ver
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid2">
            <section className="box">
              <div className="sec">
                <h3>Dados do projeto</h3>
                {canEdit && (
                  <ProjectFormDialog
                    label="Editar"
                    title="Editar projeto"
                    action={updateProject.bind(null, id)}
                    buttonClass="btn sm ghost"
                    project={p}
                    extraFooter={
                      role === "admin" ? (
                        <ActionButton
                          action={deleteProject.bind(null, id)}
                          label="Excluir projeto"
                          confirm={`Excluir "${p.name}" com documentos, ações e cronograma?`}
                          className="btn danger"
                        />
                      ) : undefined
                    }
                    {...projectFormOptions(clients, calls)}
                  />
                )}
              </div>
              <div className="facts">
                <div className="fact">
                  <span className="l">Cliente</span>
                  <span className="v">
                    {client ? <Link href={`/clientes/${client.id}`}>{client.name}</Link> : "—"}
                  </span>
                </div>
                <div className="fact">
                  <span className="l">Tipologia</span>
                  <span className="v">{p.typology || "—"}</span>
                </div>
                <div className="fact">
                  <span className="l">Modalidade</span>
                  <span className="v">{MODALITY_LABELS[p.modality]}</span>
                </div>
                <div className="fact">
                  <span className="l">Nível de tensão</span>
                  <span className="v">{p.voltage_level || "—"}</span>
                </div>
                <div className="fact">
                  <span className="l">Município</span>
                  <span className="v">{p.municipality || "—"}</span>
                </div>
                <div className="fact">
                  <span className="l">Responsável</span>
                  <span className="v">{p.responsible || "—"}</span>
                </div>
                <NextActionFact
                  table="projects"
                  id={id}
                  date={p.next_action_on ?? null}
                  text={p.next_action ?? null}
                  today={today}
                  canEdit={canEdit}
                />
              </div>
              {flags.length > 0 && (
                <div className="row">
                  {flags.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </section>
            <UnitsSection projectId={id} units={bundle.units} canEdit={canEditDetails} />
          </div>

          <div className="grid2">
            <section className="box">
              <div className="sec">
                <h3>Pasta no OneDrive</h3>
                {canEdit && (
                  <FormDialog
                    label={p.folder_url ? "Alterar" : "Adicionar link"}
                    title="Pasta no OneDrive"
                    action={setFolder.bind(null, id)}
                    buttonClass="btn sm ghost"
                  >
                    <div className="field">
                      <label htmlFor="folder">Link da pasta</label>
                      <input id="folder" name="folder_url" type="url" defaultValue={p.folder_url ?? ""} />
                      <span className="hint">No OneDrive, use Compartilhar → Copiar link</span>
                    </div>
                  </FormDialog>
                )}
              </div>
              {p.folder_url ? (
                <a className="btn" href={p.folder_url} target="_blank" rel="noopener">
                  Abrir pasta do projeto
                </a>
              ) : (
                <p className="help">Cole o link da pasta para abrir direto daqui.</p>
              )}
              <details className="more">
                <summary>Estrutura de pastas sugerida</summary>
                <div className="in">
                  <div className="folder">
                    {folderTree(
                      p.name,
                      bundle.units.map((u) => u.number),
                    )}
                  </div>
                </div>
              </details>
            </section>
            <section className="box">
              <div className="sec">
                <h3>Histórico</h3>
                {canEdit && (
                  <InteractionDialog parent={{ project_id: id }} buttonClass="btn sm ghost" />
                )}
              </div>
              <Timeline interactions={interactions} canEdit={canEdit} visible={3} />
            </section>
          </div>

          {call?.rules.rules && (
            <details className="more">
              <summary>
                <span>
                  Conferência final antes de enviar<small>{call.rules.rules.length} regras do edital</small>
                </span>
              </summary>
              <div className="in">
                <div className="list">
                  {call.rules.rules.map((r) => (
                    <div key={r.text} className="item">
                      <div className="grow">{r.text}</div>
                      <span className="muted small mono">{r.ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}
