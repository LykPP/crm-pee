// Prototype seed data, bundled with the app. Keys are the prototype ids.
import cemig from "../../../prototype/seed/distribuidoras/cemig.json";
import enelRio from "../../../prototype/seed/distribuidoras/enel-rio.json";
import energisaMr from "../../../prototype/seed/distribuidoras/energisa-mr.json";
import light from "../../../prototype/seed/distribuidoras/light.json";
import cemigCpp2026 from "../../../prototype/seed/editais/cemig-cpp-001-2026.json";
import enelRioCpp2026 from "../../../prototype/seed/editais/enel-rio-cpp-001-2026.json";
import energisaMrCpp2025 from "../../../prototype/seed/editais/energisa-mr-cpp-001-2025.json";
import c1 from "../../../prototype/seed/clientes/c1.json";
import c2 from "../../../prototype/seed/clientes/c2.json";
import c3 from "../../../prototype/seed/clientes/c3.json";
import c4 from "../../../prototype/seed/clientes/c4.json";
import c5 from "../../../prototype/seed/clientes/c5.json";
import c6 from "../../../prototype/seed/clientes/c6.json";
import p1 from "../../../prototype/seed/projetos/p1.json";
import p2 from "../../../prototype/seed/projetos/p2.json";
import p3 from "../../../prototype/seed/projetos/p3.json";
import p4 from "../../../prototype/seed/projetos/p4.json";
import i1 from "../../../prototype/seed/interacoes/i1.json";
import i2 from "../../../prototype/seed/interacoes/i2.json";
import i3 from "../../../prototype/seed/interacoes/i3.json";
import i4 from "../../../prototype/seed/interacoes/i4.json";
import i5 from "../../../prototype/seed/interacoes/i5.json";
import i6 from "../../../prototype/seed/interacoes/i6.json";
import type {
  ProtoCall,
  ProtoClient,
  ProtoInteraction,
  ProtoProject,
  ProtoUtility,
} from "./prototype";

export const seedUtilities: Record<string, ProtoUtility> = {
  cemig,
  "enel-rio": enelRio,
  "energisa-mr": energisaMr,
  light,
};

export const seedCalls: Record<string, ProtoCall> = {
  "cemig-cpp-001-2026": cemigCpp2026,
  "enel-rio-cpp-001-2026": enelRioCpp2026,
  "energisa-mr-cpp-001-2025": energisaMrCpp2025,
};

export const seedClients: Record<string, ProtoClient> = { c1, c2, c3, c4, c5, c6 };

export const seedProjects: Record<string, ProtoProject> = { p1, p2, p3, p4 };

export const seedInteractions: Record<string, ProtoInteraction> = { i1, i2, i3, i4, i5, i6 };
