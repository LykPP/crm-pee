export type MemberRole = "admin" | "technician" | "sales" | "viewer";

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Administrador",
  technician: "Técnico",
  sales: "Comercial",
  viewer: "Leitor",
};

/** What each role can do, as shown to the person choosing it. */
export const ROLE_HINTS: Record<MemberRole, string> = {
  admin: "Tudo, inclusive convidar pessoas e editar editais",
  technician: "Clientes, projetos, documentos, ações e custos",
  sales: "Clientes, contatos, conversas e andamento; não vê custos",
  viewer: "Só visualiza; não vê custos",
};
