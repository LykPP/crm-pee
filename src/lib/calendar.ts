/** Month grid and iCalendar export for the agenda. */
import type { AgendaEvent } from "@/lib/agenda";
import { EVENT_LABELS } from "@/lib/agenda";
import { addDays } from "@/lib/pee";

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-10" from a query value, falling back to the month of `today`. */
export function parseMonth(value: string | undefined, today: string) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** Weeks from Sunday to Saturday covering the whole month. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  let day = addDays(first, -weekday);
  const weeks: string[][] = [];
  do {
    const week = Array.from({ length: 7 }, (_, i) => addDays(day, i));
    weeks.push(week);
    day = addDays(day, 7);
  } while (day.slice(0, 7) === month);
  return weeks;
}

function escape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Lines longer than 75 octets are folded, as RFC 5545 requires. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

function uid(e: AgendaEvent) {
  let h = 0;
  for (const ch of `${e.kind}|${e.href}|${e.title}|${e.date}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `${e.date}-${(h >>> 0).toString(36)}@painel-pee`;
}

/** All-day events that Outlook and Google Calendar can import. */
export function toICalendar(events: AgendaEvent[], baseUrl: string, stamp = new Date()) {
  const dt = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Painel PEE//Agenda//PT-BR", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    const day = e.date.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid(e)}`,
      `DTSTAMP:${dt}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`,
      `SUMMARY:${escape(`${e.title} · ${e.subject}`)}`,
      `DESCRIPTION:${escape(EVENT_LABELS[e.kind])}`,
      `URL:${baseUrl}${e.href}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
