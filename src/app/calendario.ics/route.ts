import { NextResponse, type NextRequest } from "next/server";
import { agendaEvents } from "@/lib/agenda";
import { toICalendar } from "@/lib/calendar";
import { loadAgenda } from "@/lib/data/agenda";
import { addDays, todayInBrazil } from "@/lib/pee";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** The organization's agenda as a file to import into Outlook or Google Calendar. */
export async function GET(request: NextRequest) {
  const { role } = await requireMembership();
  const supabase = await createClient();
  const { input } = await loadAgenda(supabase, role);
  const today = todayInBrazil();
  const from = addDays(today, -30);
  const events = agendaEvents(input, today).filter((e) => e.date >= from);
  return new NextResponse(toICalendar(events, request.nextUrl.origin), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="painel-pee.ics"',
      "Cache-Control": "no-store",
    },
  });
}
