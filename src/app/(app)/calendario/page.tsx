import Link from "next/link";
import { EventList } from "@/components/event-list";
import { EVENT_LABELS, agendaEvents, type AgendaEvent, type EventKind } from "@/lib/agenda";
import { WEEKDAYS, monthGrid, monthLabel, parseMonth, shiftMonth } from "@/lib/calendar";
import { loadAgenda } from "@/lib/data/agenda";
import { capitalize } from "@/lib/labels";
import { todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const PER_DAY = 3;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const { input } = await loadAgenda(supabase, role);
  const today = todayInBrazil();
  const month = parseMonth((await searchParams).mes, today);
  const weeks = monthGrid(month);
  const first = weeks[0][0];
  const last = weeks.at(-1)!.at(-1)!;

  const events = agendaEvents(input, today).filter((e) => e.date >= first && e.date <= last);
  const byDay = new Map<string, AgendaEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const inMonth = events.filter((e) => e.date.startsWith(month));

  return (
    <>
      <div className="head">
        <div>
          <h1>Calendário</h1>
          <p>Próximas ações, prazos de editais, validade de certidões e etapas de obra.</p>
        </div>
        <a className="btn" href="/calendario.ics" download>
          Baixar para Outlook ou Google
        </a>
      </div>

      <div className="sec">
        <div className="row">
          <Link className="btn sm" href={`/calendario?mes=${shiftMonth(month, -1)}`} aria-label="Mês anterior">
            ←
          </Link>
          <h2 style={{ minWidth: 200, textAlign: "center" }}>{capitalize(monthLabel(month))}</h2>
          <Link className="btn sm" href={`/calendario?mes=${shiftMonth(month, 1)}`} aria-label="Próximo mês">
            →
          </Link>
          {month !== today.slice(0, 7) && (
            <Link className="btn sm ghost" href="/calendario">
              Hoje
            </Link>
          )}
        </div>
        <div className="row legend">
          {(Object.keys(EVENT_LABELS) as EventKind[]).map((k) => (
            <span key={k} className={`chip k-${k}`}>
              {EVENT_LABELS[k]}
            </span>
          ))}
        </div>
      </div>

      <div className="calgrid" role="grid" aria-label={monthLabel(month)}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="wd" role="columnheader">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const list = byDay.get(day) ?? [];
          const classes = ["day", day.startsWith(month) ? "" : "out", day === today ? "today" : ""];
          return (
            <div key={day} className={classes.join(" ")} role="gridcell">
              <span className="n">{Number(day.slice(8))}</span>
              {list.slice(0, PER_DAY).map((e, i) => (
                <Link key={i} href={e.href} className={`cev k-${e.kind} ${e.tone}`} title={`${e.title} · ${e.subject}`}>
                  {e.title}
                  <small>{e.subject}</small>
                </Link>
              ))}
              {list.length > PER_DAY && <span className="more-ev">+{list.length - PER_DAY} mais</span>}
            </div>
          );
        })}
      </div>

      <section className="box calist">
        <h3>Neste mês</h3>
        {inMonth.length ? (
          <EventList events={inMonth} today={today} />
        ) : (
          <p className="muted">Nada marcado neste mês.</p>
        )}
      </section>
    </>
  );
}
