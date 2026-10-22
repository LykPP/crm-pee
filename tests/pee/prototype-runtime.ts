/**
 * Loads the business functions straight from prototype/crm-prototipo.html
 * so the new implementation can be compared with the approved one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedCalls, seedClients, seedProjects, seedUtilities } from "@/lib/seed/data";

const html = readFileSync(join(__dirname, "..", "..", "prototype", "crm-prototipo.html"), "utf8");

function block(start: string) {
  const i = html.indexOf(start);
  if (i < 0) throw new Error(`Prototype function not found: ${start}`);
  return html.slice(i, html.indexOf("\n}", i) + 2);
}

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
    line(/function verdictOf\([^\n]*\n/),
    block("function tplCliente("),
    line(/function folderTree\([^\n]*\n(?:[^\n]*\n)*?[^\n]*`\}\n/),
    // The prototype opens a dialog; capture its arguments instead.
    "let __composed = null; function compose(o) { __composed = o; }",
  ].join("\n");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function loadPrototype() {
  const factory = new Function(
    `${extract()}\nreturn { S, calc, docRows, docSummary, projIssues, nextStep, verdictOf, folderTree, tplCliente: (c, t) => { tplCliente(c, t); return __composed; } };`,
  );
  const proto = factory() as {
    S: any;
    calc: (p: any) => any;
    docRows: (p: any, e: any) => any[];
    docSummary: (p: any) => any;
    projIssues: (p: any) => any[];
    nextStep: (p: any) => { t: string };
    verdictOf: (p: any) => { c: string; t: string };
    folderTree: (p: any) => string;
    tplCliente: (c: any, kind: string) => { assunto: string; corpo: string; para?: string };
  };
  for (const [id, e] of Object.entries(seedCalls)) proto.S.editais[id] = { id, ...structuredClone(e) };
  for (const [id, p] of Object.entries(seedProjects)) proto.S.projetos[id] = { id, ...structuredClone(p) };
  for (const [id, c] of Object.entries(seedClients)) proto.S.clientes[id] = { id, ...structuredClone(c) };
  for (const [id, u] of Object.entries(seedUtilities)) proto.S.distribuidoras[id] = { id, ...structuredClone(u) };
  return proto;
}
