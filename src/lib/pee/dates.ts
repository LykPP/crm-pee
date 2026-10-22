/**
 * Date helpers on ISO dates (YYYY-MM-DD). Calendar arithmetic follows
 * JavaScript Date overflow, as in the prototype: 31/05 minus 3 months is
 * 03/03 when February has 28 days.
 */

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function format(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number) {
  const { y, m, d } = parse(iso);
  return format(Date.UTC(y, m - 1 + months, d));
}

export function addDays(iso: string, days: number) {
  const { y, m, d } = parse(iso);
  return format(Date.UTC(y, m - 1, d + days));
}

/** Whole days from a to b (negative when b is earlier). */
export function daysBetween(a: string, b: string) {
  const pa = parse(a);
  const pb = parse(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 864e5);
}

/** Today in Brazil (São Paulo), as an ISO date. */
export function todayInBrazil(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
