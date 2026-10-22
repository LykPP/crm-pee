import { headers } from "next/headers";
import { ActionButton } from "@/components/action-button";
import { Compose } from "@/components/compose";
import { FormDialog } from "@/components/form-dialog";
import { RoleSelect } from "./role-select";
import { cancelInvitation, changeRole, inviteMember, removeMember } from "./actions";
import { describeChange, type AuditRow } from "@/lib/audit";
import { formatDate } from "@/lib/labels";
import { ROLE_HINTS, ROLE_LABELS, requireMembership, type MemberRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const AUDIT_ROWS = 50;
const TIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

interface Member {
  user_id: string;
  email: string;
  role: MemberRole;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

function inviteMessage(orgName: string, role: MemberRole, email: string, siteUrl: string) {
  return {
    subject: `Convite para o Painel PEE da ${orgName}`,
    body:
      `Olá,\n\nVocê recebeu um convite para usar o Painel PEE da ${orgName} como ${ROLE_LABELS[role]}.\n\n` +
      `Para entrar:\n1. Acesse ${siteUrl}/login\n2. Digite este e-mail: ${email}\n` +
      "3. Clique no link que chegar na sua caixa de entrada (confira também o spam).\n\n" +
      "No primeiro acesso você já entra na equipe.\n\nAtenciosamente,",
  };
}

export default async function TeamPage() {
  const { user, org, role } = await requireMembership();
  const supabase = await createClient();
  const isAdmin = role === "admin";
  const [members, invitations, audit] = await Promise.all([
    supabase.rpc("list_members", { target_org: org.id }),
    isAdmin
      ? supabase.from("invitations").select("id, email, role, created_at").is("accepted_at", null).order("created_at")
      : null,
    isAdmin
      ? supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(AUDIT_ROWS)
      : null,
  ]);
  const people = (members.data ?? []) as Member[];
  const pending = (invitations?.data ?? []) as Invitation[];
  const changes = (audit?.data ?? []) as AuditRow[];
  const emailOf = new Map(people.map((m) => [m.user_id, m.email]));
  const h = await headers();
  const siteUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  return (
    <>
      <div className="head">
        <div>
          <h1>Equipe</h1>
          <p>Quem usa o Painel PEE da {org.name} e o que cada pessoa pode fazer.</p>
        </div>
        {isAdmin && (
          <FormDialog label="Convidar pessoa" title="Convidar pessoa" action={inviteMember} buttonClass="btn pri">
            <div className="fgrid">
              <div className="field full">
                <label htmlFor="inv-email">E-mail de trabalho</label>
                <input id="inv-email" name="email" type="email" required />
              </div>
              <div className="field full">
                <span className="label">Papel</span>
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                  <label key={r} className="radio">
                    <input type="radio" name="role" value={r} defaultChecked={r === "technician"} />
                    <span>
                      <b>{ROLE_LABELS[r]}</b>
                      <small>{ROLE_HINTS[r]}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <p className="help">
              Depois de criar o convite, use o botão Enviar convite para mandar as instruções por e-mail
              ou WhatsApp.
            </p>
          </FormDialog>
        )}
      </div>

      <section className="box">
        <h3>Pessoas</h3>
        <div className="list">
          {people.map((m) => (
            <div key={m.user_id} className="item">
              <div className="grow">
                <div className="t">
                  {m.email} {m.user_id === user.id && <span className="chip acc">você</span>}
                </div>
                <div className="s">
                  {ROLE_HINTS[m.role]} · desde {formatDate(m.joined_at)}
                </div>
              </div>
              {isAdmin ? (
                <div className="row">
                  <RoleSelect role={m.role} action={changeRole.bind(null, m.user_id)} />
                  {m.user_id !== user.id && (
                    <ActionButton
                      action={removeMember.bind(null, m.user_id)}
                      label="Remover"
                      confirm={`Remover ${m.email} da equipe?`}
                      className="btn sm ghost danger"
                    />
                  )}
                </div>
              ) : (
                <span className="chip">{ROLE_LABELS[m.role]}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="box">
          <h3>Convites pendentes</h3>
          {pending.length ? (
            <div className="list">
              {pending.map((inv) => {
                const msg = inviteMessage(org.name, inv.role, inv.email, siteUrl);
                return (
                  <div key={inv.id} className="item">
                    <div className="grow">
                      <div className="t">{inv.email}</div>
                      <div className="s">
                        {ROLE_LABELS[inv.role]} · convidado em {formatDate(inv.created_at)}
                      </div>
                    </div>
                    <div className="row">
                      <Compose
                        label="Enviar convite"
                        title={`Convite para ${inv.email}`}
                        to={inv.email}
                        subject={msg.subject}
                        body={msg.body}
                        buttonClass="btn sm"
                      />
                      <ActionButton
                        action={cancelInvitation.bind(null, inv.id)}
                        label="Cancelar"
                        confirm={`Cancelar o convite de ${inv.email}?`}
                        className="btn sm ghost danger"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="help">Nenhum convite pendente. Quem é convidado entra na equipe no primeiro acesso.</p>
          )}
        </section>
      )}

      {isAdmin && (
        <details className="more">
          <summary>
            <span>
              Histórico de alterações<small>últimas {AUDIT_ROWS}</small>
            </span>
          </summary>
          <div className="in">
            {changes.length ? (
              <div className="tl">
                {changes.map((c) => (
                  <div key={c.id} className="ev">
                    <span className="d">{TIME.format(new Date(c.changed_at))}</span>
                    <div>
                      <b>{(c.changed_by && emailOf.get(c.changed_by)) ?? "ex-membro da equipe"}</b>{" "}
                      {describeChange(c)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="help">Nenhuma alteração registrada ainda.</p>
            )}
          </div>
        </details>
      )}
    </>
  );
}
