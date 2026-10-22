"use client";

import { useActionState } from "react";
import { createOrganization, type CreateOrgState } from "./actions";

export function OrgForm() {
  const [state, action, pending] = useActionState<CreateOrgState, FormData>(
    createOrganization,
    {},
  );
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="name">Nome da ESCO</label>
        <input id="name" name="name" required minLength={2} maxLength={120} />
        <span className="hint">Você será o administrador e poderá convidar a equipe depois.</span>
      </div>
      {state.error && (
        <div className="msg bad" role="alert">
          {state.error}
        </div>
      )}
      <button type="submit" className="btn pri" disabled={pending}>
        {pending ? "Criando..." : "Criar organização"}
      </button>
    </form>
  );
}
