import Link from "next/link";
import { EVENT_LABELS, relativeDay, type AgendaEvent } from "@/lib/agenda";
import { formatDate } from "@/lib/labels";

/** Dated events as a compact list: when, what and about whom. */
export function EventList({ events, today }: { events: AgendaEvent[]; today: string }) {
  return (
    <div className="tasks">
      {events.map((e, i) => (
        <Link key={`${e.date}-${e.href}-${i}`} href={e.href} className="task evt">
          <span className={`when ${e.date === today ? "today" : ""}`}>
            <b>{formatDate(e.date).slice(0, 5)}</b>
            <small>{relativeDay(e.date, today)}</small>
          </span>
          <div className="grow">
            <div className="t">{e.title}</div>
            <div className="s">
              <span className={`chip k-${e.kind}`}>{EVENT_LABELS[e.kind]}</span> {e.subject}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
