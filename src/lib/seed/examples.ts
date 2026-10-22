/**
 * Fictitious example data (clients, projects, interactions) from the
 * prototype, prepared as rows for one organization.
 */
import { seedClients, seedInteractions, seedProjects, seedUtilities } from "./data";
import {
  convertAction,
  convertClient,
  convertContact,
  convertCosts,
  convertDocument,
  convertExecutionStep,
  convertInteraction,
  convertProject,
} from "./prototype";

type Row = Record<string, unknown>;

/** Tables in insertion order; deleting runs in reverse. */
export const EXAMPLE_TABLES = [
  "clients",
  "contacts",
  "projects",
  "consumer_units",
  "project_documents",
  "efficiency_actions",
  "project_costs",
  "execution_steps",
  "interactions",
] as const;

export type ExampleRows = Record<(typeof EXAMPLE_TABLES)[number], Row[]>;

export function buildExampleRows(
  orgId: string,
  utilityIdBySlug: Record<string, string>,
  callIdBySlug: Record<string, string>,
  newId: () => string = () => crypto.randomUUID(),
): ExampleRows {
  const out: ExampleRows = Object.fromEntries(EXAMPLE_TABLES.map((t) => [t, []])) as unknown as ExampleRows;
  const clientIds: Record<string, string> = {};
  const projectIds: Record<string, string> = {};

  const utility = (slug?: string) => {
    if (!slug) return null;
    const id = utilityIdBySlug[slug];
    if (!id) throw new Error(`Utility ${slug} is missing; load the reference data first.`);
    return id;
  };

  for (const [key, c] of Object.entries(seedClients)) {
    const id = (clientIds[key] = newId());
    out.clients.push({ id, org_id: orgId, utility_id: utility(c.distribuidoraId), ...convertClient(c) });
    for (const contact of c.contatos ?? []) {
      out.contacts.push({ org_id: orgId, client_id: id, ...convertContact(contact) });
    }
  }

  for (const [key, p] of Object.entries(seedProjects)) {
    const id = (projectIds[key] = newId());
    const callId = p.editalId ? callIdBySlug[p.editalId] : null;
    if (p.editalId && !callId) throw new Error(`Call ${p.editalId} is missing; load the reference data first.`);
    out.projects.push({
      id,
      org_id: orgId,
      client_id: clientIds[p.clienteId],
      call_id: callId,
      ...convertProject(p),
    });

    const unitIds: Record<string, string> = {};
    (p.ucs ?? []).forEach((u, position) => {
      unitIds[u.id] = newId();
      out.consumer_units.push({
        id: unitIds[u.id],
        org_id: orgId,
        project_id: id,
        number: u.numero,
        description: u.descricao ?? null,
        position,
      });
    });

    for (const [docKey, d] of Object.entries(p.docs ?? {})) {
      const doc = convertDocument(docKey, d);
      out.project_documents.push({
        org_id: orgId,
        project_id: id,
        consumer_unit_id: doc.unitId ? unitIds[doc.unitId] : null,
        ...doc.row,
      });
    }

    (p.acoes ?? []).forEach((a, position) => {
      out.efficiency_actions.push({ org_id: orgId, project_id: id, ...convertAction(a, position) });
    });

    if (p.custos) out.project_costs.push({ org_id: orgId, project_id: id, ...convertCosts(p.custos) });

    for (const [stepKey, s] of Object.entries(p.execucao ?? {})) {
      out.execution_steps.push({ org_id: orgId, project_id: id, ...convertExecutionStep(stepKey, s) });
    }
  }

  for (const i of Object.values(seedInteractions)) {
    out.interactions.push({
      org_id: orgId,
      client_id: i.clienteId ? clientIds[i.clienteId] : null,
      project_id: i.projetoId ? projectIds[i.projetoId] : null,
      utility_id: utility(i.distribuidoraId),
      ...convertInteraction(i),
    });
  }

  return out;
}

export const EXAMPLE_UTILITY_SLUGS = Object.keys(seedUtilities);
