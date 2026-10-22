import { describe, expect, it } from "vitest";
import { monthGrid, monthLabel, parseMonth, shiftMonth, toICalendar } from "./calendar";

describe("calendar", () => {
  it("builds Sunday to Saturday weeks covering the month", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks[0][0]).toBe("2026-11-01"); // November 2026 starts on a Sunday
    expect(weeks.at(-1)!.at(-1)).toBe("2026-12-05");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(monthGrid("2026-10")[0][0]).toBe("2026-09-27");
  });

  it("navigates and names months", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthLabel("2026-11")).toBe("novembro de 2026");
    expect(parseMonth("2026-13", "2026-10-22")).toBe("2026-10");
    expect(parseMonth("2027-02", "2026-10-22")).toBe("2027-02");
  });

  it("exports all-day events for Outlook and Google Calendar", () => {
    const ics = toICalendar(
      [
        {
          date: "2026-11-06",
          kind: "call_deadline",
          title: "Prazo de envio das propostas",
          subject: "Cemig D CPP 001/2026, com observação longa o bastante para dobrar a linha do arquivo",
          href: "/editais/abc",
          tone: "bad",
        },
      ],
      "https://crm-pee.vercel.app",
      new Date("2026-10-22T12:00:00Z"),
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261106\r\nDTEND;VALUE=DATE:20261107");
    expect(ics).toContain("URL:https://crm-pee.vercel.app/editais/abc");
    // Readers join folded lines before parsing.
    expect(ics.replace(/\r\n /g, "")).toContain("SUMMARY:Prazo de envio das propostas · Cemig D CPP 001/2026\\, com observação");
    expect(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
