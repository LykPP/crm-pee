/** Message drafts for clients, with the prototype's wording. */
import { formatDate } from "@/lib/labels";
import { addDays, documentRows, type ProjectBundle } from "@/lib/pee";

export type ClientMessageKind = "presentation" | "visit" | "documents";

export const MODALITY_LABELS = { fp: "Fundo Perdido", cd: "Contrato de Desempenho" } as const;

export interface MessageContext {
  client: {
    name: string;
    municipality: string | null;
    typology: string | null;
    modality: "fp" | "cd" | null;
  };
  /** The primary contact, or the first one. */
  contactName?: string | null;
  /** The client's active project, if any. */
  project?: ProjectBundle | null;
  /** The project's call, or else the open call. */
  call?: { code: string; submission_deadline: string | null; utilityName: string | null } | null;
  today: string;
}

export function clientMessage(kind: ClientMessageKind, ctx: MessageContext) {
  const { client: c, call: e, project: p } = ctx;
  const first = ctx.contactName ? ctx.contactName.split(" ")[0] : "";
  const hello = `Olá${first ? " " + first : ""},`;
  const deadline = e?.submission_deadline ? formatDate(e.submission_deadline) : "";

  if (kind === "presentation") {
    const modality = c.modality ? MODALITY_LABELS[c.modality] : "a definir";
    const modalityNote =
      c.modality === "fp"
        ? " (recursos a fundo perdido, sem reembolso)"
        : c.modality === "cd"
          ? " (o investimento é pago com a própria economia de energia, em até 5 anos)"
          : "";
    return {
      subject: `Projeto de eficiência energética sem custo pelo PEE${e ? " — " + e.code : ""}`,
      body:
        `${hello}\n\nSomos uma ESCO que desenvolve projetos do Programa de Eficiência Energética (PEE), regulado pela ANEEL e financiado pela ${e ? e.utilityName || "distribuidora" : "distribuidora"}.\n\n` +
        `Pelo perfil da ${c.name}, o projeto se enquadraria na tipologia ${c.typology || "—"}, na modalidade ${modality}${modalityNote}.\n\n` +
        "Ações típicas: troca de iluminação por LED, ar-condicionado inverter, motores de alto rendimento e, quando viável, geração solar.\n\n" +
        (e?.submission_deadline
          ? `A chamada pública ${e.code} recebe propostas até ${deadline}. Para chegar a tempo, o ideal é fazermos uma visita técnica nas próximas semanas.\n\n`
          : "") +
        "Podemos agendar uma conversa rápida esta semana?\n\nAtenciosamente,",
    };
  }

  if (kind === "documents") {
    const pending = p
      ? documentRows(p.project, p.call, p.units, p.documents, ctx.today)
          .filter((r) => ["missing", "expired", "no_date"].includes(r.status.kind))
          .map(
            (r) =>
              `• ${r.item.name}${r.unit ? ` (UC ${r.unit.number})` : ""}${r.status.kind === "expired" ? " — enviar versão atualizada" : ""}`,
          )
      : [];
    return {
      subject: `Documentos pendentes${p ? " — " + p.project.name : ""}`,
      body:
        `${hello}\n\nPara concluirmos a proposta${e ? " da " + e.code : ""}${deadline ? ` (prazo de submissão: ${deadline})` : ""}, ainda precisamos dos itens abaixo:\n\n` +
        `${pending.length ? pending.join("\n") : "• (nenhuma pendência registrada)"}\n\n` +
        "Certidões precisam estar válidas na data de envio da proposta, e a fatura de energia deve ser de no máximo 3 meses antes da submissão.\n\n" +
        `Pode nos enviar até ${e?.submission_deadline ? formatDate(addDays(e.submission_deadline, -7)) : "a próxima semana"}?\n\nObrigado,`,
    };
  }

  return {
    subject: `Agendamento de visita técnica — ${c.name}`,
    body:
      `${hello}\n\nGostaríamos de agendar a visita técnica para o levantamento do diagnóstico energético na ${c.name}${c.municipality ? ` (${c.municipality})` : ""}.\n\n` +
      "Na visita vamos:\n• registrar os equipamentos atuais (iluminação, climatização, motores) com fotos das placas;\n• conferir os horários de funcionamento de cada ambiente;\n• coletar a fatura de energia mais recente de cada unidade consumidora.\n\n" +
      `A visita leva cerca de ${c.typology === "Iluminação Pública" ? "2 dias" : "meio período"}. Quais datas funcionam para vocês?\n\nAtenciosamente,`,
  };
}
