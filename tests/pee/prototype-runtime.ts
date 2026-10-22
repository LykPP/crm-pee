/**
 * Loads the business functions straight from prototype/crm-prototipo.html
 * so the new implementation can be compared with the approved one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedCalls, seedProjects } from "@/lib/seed/data";

const html = readFileSync(join(__dirname, "..", "..", "prototype", "crm-prototipo.html"), "utf8");

function extract(): string {
  const script = html.slice(html.indexOf("<script>") + "<script>".length);
  const core = script.slice(0, script.indexOf("/* ---------- db"));
  const line = (re: RegExp) => {
    const m = script.match(re);
    if (!m) throw new Error(`Prototype function not found: ${re}`);
    return m[0];
  };
  return [
    core,
    line(/const NEXT_HINT=\{[^\n]*\};/),
    line(/function issueAction\([^\n]*\n/),
    line(/function nextStep\([^\n]*\n/),
  ].join("\n");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function loadPrototype() {
  const factory = new Function(
    `${extract()}\nreturn { S, calc, docRows, docSummary, projIssues, nextStep };`,
  );
  const proto = factory() as {
    S: any;
    calc: (p: any) => any;
    docRows: (p: any, e: any) => any[];
    docSummary: (p: any) => any;
    projIssues: (p: any) => any[];
    nextStep: (p: any) => { t: string };
  };
  for (const [id, e] of Object.entries(seedCalls)) proto.S.editais[id] = { id, ...structuredClone(e) };
  for (const [id, p] of Object.entries(seedProjects)) proto.S.projetos[id] = { id, ...structuredClone(p) };
  return proto;
}
