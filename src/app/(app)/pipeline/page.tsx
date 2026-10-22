import Link from "next/link";
import { ProjectFormDialog } from "../projetos/project-form";
import { StageSelect } from "../projetos/stage-select";
import { createProject, setStage } from "../projetos/actions";
import { listClients } from "@/lib/data/clients";
import { projectFormOptions } from "@/lib/data/project-options";
import { loadProjectBundles } from "@/lib/data/projects";
import { listCalls } from "@/lib/data/reference";
import { PHASES, documentRows, feasibility, summarizeDocuments, todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function PipelinePage() {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const [bundles, clients, calls] = await Promise.all([
    loadProjectBundles(supabase, role),
    listClients(supabase),
    listCalls(supabase),
  ]);
  const today = todayInBrazil();
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const canEdit = role !== "viewer";

  return (
    <>
      <div className="head">
        <div>
          <h1>Pipeline</h1>
          <p>Todos os projetos agrupados em cinco fases. Mude a etapa pelo seletor de cada cartão.</p>
        </div>
        {canEdit && clients.length > 0 && (
          <ProjectFormDialog
            label="Novo projeto"
            title="Novo projeto"
            action={createProject}
            buttonClass="btn pri"
            {...projectFormOptions(clients, calls)}
          />
        )}
      </div>
      <div className="kanban">
        {PHASES.map((phase) => {
          const items = bundles.filter((b) => phase.stages.includes(b.project.stage));
          return (
            <section key={phase.name} className="col" aria-label={phase.name}>
              <h3>
                <span>{phase.name}</span>
                <span className="num muted">{items.length}</span>
              </h3>
              <p className="hint">{phase.hint}</p>
              {items.map((b) => {
                const docs = summarizeDocuments(
                  documentRows(b.project, b.call, b.units, b.documents, today),
                );
                const verdict = feasibility(b);
                return (
                  <div key={b.project.id} className="kcard">
                    <Link className="t" href={`/projetos/${b.project.id}`}>
                      {b.project.name}
                    </Link>
                    <span className="small muted">{clientName.get(b.project.client_id)}</span>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="small">
                        Docs {docs.ok}/{docs.total}
                      </span>
                      {b.actions && <span className={`chip ${verdict.tone}`}>{verdict.label}</span>}
                    </div>
                    <StageSelect
                      compact
                      stage={b.project.stage}
                      action={setStage.bind(null, b.project.id)}
                      disabled={!canEdit}
                    />
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
