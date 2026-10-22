import Link from "next/link";
import {
  PHASES,
  STAGE_LABELS,
  documentRows,
  feasibility,
  phaseIndex,
  summarizeDocuments,
  type ProjectBundle,
} from "@/lib/pee";

/** Summary card of a project, as in the prototype. */
export function ProjectCard({
  bundle,
  clientName,
  isExample,
  today,
}: {
  bundle: ProjectBundle;
  clientName?: string;
  isExample?: boolean;
  today: string;
}) {
  const { project } = bundle;
  const docs = summarizeDocuments(documentRows(project, bundle.call, bundle.units, bundle.documents, today));
  const phase = phaseIndex(project.stage);
  const verdict = feasibility(bundle);

  return (
    <Link href={`/projetos/${project.id}`} className="pcard">
      <span>
        <span className="t">{project.name}</span>
        {isExample && <> <span className="chip ex">exemplo</span></>}
        {clientName && (
          <>
            <br />
            <span className="s">{clientName}</span>
          </>
        )}
      </span>
      <span className="steps" aria-label={`Fase ${phase + 1} de ${PHASES.length}`}>
        {PHASES.map((p, i) => (
          <i key={p.name} className={project.stage === "lost" && i === 4 ? "lost" : i <= phase ? "on" : ""} />
        ))}
      </span>
      <span className="meta">
        <span>{STAGE_LABELS[project.stage]}</span>
        {bundle.actions && <span className={`chip ${verdict.tone}`}>{verdict.label}</span>}
      </span>
      {docs.total > 0 && (
        <>
          <span className="meta">
            <span>
              Documentos {docs.ok} de {docs.total}
            </span>
            {docs.expired > 0 && <span style={{ color: "var(--bad)" }}>{docs.expired} vencido(s)</span>}
          </span>
          <span className="bar">
            <i className="ok" style={{ width: `${docs.pct * 100}%` }} />
            <i className="bad" style={{ width: `${(docs.expired / docs.total) * 100}%` }} />
          </span>
        </>
      )}
    </Link>
  );
}
