/** Example projects as domain bundles, keyed by prototype id (p1, p2...). */
import { seedCalls, seedProjects } from "@/lib/seed/data";
import { buildExampleRows } from "@/lib/seed/examples";
import { convertCall } from "@/lib/seed/prototype";
import type { Call, ProjectBundle } from "@/lib/pee/types";

export function exampleBundles(): Record<string, ProjectBundle> {
  const calls: Record<string, Call> = {};
  for (const [slug, c] of Object.entries(seedCalls)) {
    const row = convertCall(c);
    calls[slug] = {
      id: slug,
      published_on: row.published_on,
      submission_deadline: row.submission_deadline,
      rules: row.rules,
    };
  }
  const utilities = { cemig: "cemig", "enel-rio": "enel-rio", "energisa-mr": "energisa-mr", light: "light" };
  const callIds = Object.fromEntries(Object.keys(calls).map((k) => [k, k]));
  let n = 0;
  const rows = buildExampleRows("org", utilities, callIds, () => `id-${++n}`);

  const out: Record<string, ProjectBundle> = {};
  Object.keys(seedProjects).forEach((key, index) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = rows.projects[index] as any;
    const of = <T>(table: keyof typeof rows) =>
      rows[table].filter((r) => r.project_id === project.id) as unknown as T[];
    out[key] = {
      project,
      call: project.call_id ? calls[project.call_id] : null,
      units: of("consumer_units"),
      documents: of("project_documents"),
      actions: of("efficiency_actions"),
      costs: of<ProjectBundle["costs"]>("project_costs")[0] ?? null,
    };
  });
  return out;
}

/**
 * The prototype predates the R$ 1.500 audit required by ET 5.16.1, so
 * comparisons with its code use the calls without it.
 */
export function prototypeBundles(): Record<string, ProjectBundle> {
  const out = exampleBundles();
  for (const b of Object.values(out)) {
    if (b.call) b.call = { ...b.call, rules: { ...b.call.rules, audit: undefined } };
  }
  return out;
}
