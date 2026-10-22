import { ProjectCard } from "@/components/project-card";
import { ProjectFormDialog } from "./project-form";
import { createProject } from "./actions";
import { listClients } from "@/lib/data/clients";
import { projectFormOptions } from "@/lib/data/project-options";
import { loadProjectBundles } from "@/lib/data/projects";
import { listCalls } from "@/lib/data/reference";
import { PHASES, phaseIndex, todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const [bundles, clients, calls] = await Promise.all([
    loadProjectBundles(supabase, role),
    listClients(supabase),
    listCalls(supabase),
  ]);
  const today = todayInBrazil();
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const sorted = [...bundles].sort((a, b) => phaseIndex(a.project.stage) - phaseIndex(b.project.stage));
  const canCreate = role !== "viewer";

  const newProject = canCreate && clients.length > 0 && (
    <ProjectFormDialog
      label="Novo projeto"
      title="Novo projeto"
      action={createProject}
      buttonClass="btn pri"
      {...projectFormOptions(clients, calls)}
    />
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>Projetos</h1>
          <p>Clique em um projeto para ver o próximo passo, os documentos e a viabilidade.</p>
        </div>
        {newProject}
      </div>
      {sorted.length ? (
        PHASES.map((phase) => {
          const items = sorted.filter((b) => phase.stages.includes(b.project.stage));
          if (!items.length) return null;
          return (
            <section key={phase.name} className="stack" style={{ gap: 12 }}>
              <h4>
                {phase.name} · {items.length}
              </h4>
              <div className="cardgrid">
                {items.map((b) => (
                  <ProjectCard
                    key={b.project.id}
                    bundle={b}
                    clientName={clientName.get(b.project.client_id)}
                    isExample={b.project.is_example}
                    today={today}
                  />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <div className="empty">
          <b>Nenhum projeto</b>
          <span>
            {clients.length
              ? "Crie um projeto a partir de um cliente e de um edital."
              : "Cadastre um cliente primeiro, em Clientes."}
          </span>
          {newProject}
        </div>
      )}
    </>
  );
}
