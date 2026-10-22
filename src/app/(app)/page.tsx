import Link from "next/link";
import { Suspense } from "react";
import { EventList } from "@/components/event-list";
import { Guide } from "@/components/guide";
import { NewsBoard, NewsBoardLoading } from "@/components/news-board";
import { ProjectCard } from "@/components/project-card";
import { ExampleButtons } from "./_examples/example-buttons";
import { ClientFormDialog } from "./clientes/client-form";
import { createClientRecord } from "./clientes/actions";
import { ProjectFormDialog } from "./projetos/project-form";
import { createProject } from "./projetos/actions";
import { nextDeadline, reminders, todayTasks } from "@/lib/agenda";
import { loadAgenda } from "@/lib/data/agenda";
import { projectFormOptions } from "@/lib/data/project-options";
import { typologyOptions } from "@/lib/data/typologies";
import { capitalize, formatDate } from "@/lib/labels";
import { addDays, phaseIndex, todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const SHOWN_TASKS = 6;
const SHOWN_REMINDERS = 6;

function greeting(now = new Date()) {
  const hour = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export default async function HomePage() {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const { input, clients, calls, utilities } = await loadAgenda(supabase, role);
  const today = todayInBrazil();
  const canEdit = role !== "viewer";

  const tasks = todayTasks(input, today);
  // Next actions due within two days are already among today's tasks.
  const upcoming = reminders(input, today, 30).filter(
    (e) => e.kind !== "next_action" || e.date > addDays(today, 2),
  );
  const deadline = nextDeadline(input, today);
  const active = input.projects
    .filter((b) => !["completed", "lost"].includes(b.project.stage))
    .sort((a, b) => phaseIndex(b.project.stage) - phaseIndex(a.project.stage));
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const examples = clients.some((c) => c.is_example);
  const newsNames = [...new Set(utilities.map((u) => u.name.split(" ")[0]))];
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <div className="head">
        <div>
          <h1>{greeting()}</h1>
          <p>{capitalize(dateLabel)}</p>
        </div>
        {canEdit && (
          <div className="row">
            <ClientFormDialog
              label="Novo cliente"
              title="Novo cliente"
              action={createClientRecord}
              utilities={utilities}
              typologies={typologyOptions(calls)}
              defaultUtilityId={utilities.find((u) => u.short_name === "Cemig D")?.id}
            />
            {clients.length > 0 && (
              <ProjectFormDialog
                label="Novo projeto"
                title="Novo projeto"
                action={createProject}
                buttonClass="btn pri"
                {...projectFormOptions(clients, calls)}
              />
            )}
          </div>
        )}
      </div>

      <Guide />

      {deadline && (
        <div className="hero">
          <div className="d num">{deadline.days}</div>
          <div className="t">
            <b>
              {deadline.days === 1 ? "dia" : "dias"} para enviar propostas na {deadline.label}
            </b>
            <span>
              Prazo {formatDate(deadline.call.submission_deadline)} · {deadline.ready} de {deadline.preparing}{" "}
              propostas prontas
            </span>
          </div>
          <Link className="btn" href={`/editais/${deadline.call.id}`}>
            Ver o edital
          </Link>
        </div>
      )}

      <section className="box">
        <div className="sec">
          <h2>O que fazer agora</h2>
          {tasks.length > 0 && <span className="muted small">{tasks.length} tarefa(s)</span>}
        </div>
        {tasks.length ? (
          <>
            <div className="tasks">
              {tasks.slice(0, SHOWN_TASKS).map((t, i) => (
                <div key={`${t.href}-${i}`} className="task">
                  <span className={`dot ${t.tone}`} />
                  <div className="grow">
                    <div className="t">{t.title}</div>
                    <div className="s">{t.subtitle}</div>
                  </div>
                  <Link className="btn sm" href={t.href}>
                    Resolver
                  </Link>
                </div>
              ))}
            </div>
            {tasks.length > SHOWN_TASKS && (
              <p className="help">Mais {tasks.length - SHOWN_TASKS} tarefa(s) nos projetos e clientes.</p>
            )}
          </>
        ) : (
          <p className="muted">Tudo em dia. Nenhum documento vencido nem contato atrasado.</p>
        )}
      </section>

      <div className="grid2">
        <section className="box">
          <div className="sec">
            <h3>Lembretes</h3>
            <Link className="btn sm ghost" href="/calendario">
              Ver calendário
            </Link>
          </div>
          <p className="help">Próximos 30 dias: ações, prazos de edital, validade de certidões e etapas de obra.</p>
          {upcoming.length ? (
            <>
              <EventList events={upcoming.slice(0, SHOWN_REMINDERS)} today={today} />
              {upcoming.length > SHOWN_REMINDERS && (
                <Link className="help" href="/calendario">
                  Mais {upcoming.length - SHOWN_REMINDERS} lembrete(s) no calendário
                </Link>
              )}
            </>
          ) : (
            <p className="muted">Nada marcado para os próximos 30 dias.</p>
          )}
        </section>
        <Suspense fallback={<NewsBoardLoading />}>
          <NewsBoard utilityNames={newsNames} />
        </Suspense>
      </div>

      <section className="stack" style={{ gap: 14 }}>
        <div className="sec">
          <h2>Projetos em andamento</h2>
          <Link className="btn sm ghost" href="/projetos">
            Ver todos
          </Link>
        </div>
        {active.length ? (
          <div className="cardgrid">
            {active.map((b) => (
              <ProjectCard
                key={b.project.id}
                bundle={b}
                clientName={clientName.get(b.project.client_id)}
                isExample={b.project.is_example}
                today={today}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <b>Nenhum projeto ainda</b>
            <span>Crie um projeto ligando um cliente a um edital.</span>
          </div>
        )}
      </section>

      {role === "admin" && (
        <details className="more">
          <summary>
            <span>
              Dados de exemplo e conferência<small>para testes</small>
            </span>
          </summary>
          <div className="in">
            <p className="help">
              Os exemplos trazem clientes, projetos e conversas fictícios para experimentar o sistema.
            </p>
            <div className="row">
              <ExampleButtons loaded={examples} />
              <Link href="/conferencia" className="btn">
                Conferir cálculos
              </Link>
            </div>
          </div>
        </details>
      )}
    </>
  );
}

