"use client";

import { startTransition, useActionState } from "react";
import { sendLoginLink, type LoginState } from "./actions";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="msg ok" role="status">
        Enviamos um link de acesso para <b>{state.message}</b>. Abra o e-mail e clique no
        link para entrar. Se não chegar em alguns minutos, olhe a caixa de spam.
      </div>
    );
  }

  return (
    <form
      // Submitting by hand keeps the typed value when the server returns an error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {linkError && state.status === "idle" && (
        <div className="msg bad" role="alert">
          Esse link não vale mais. Peça um novo abaixo.
        </div>
      )}
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <span className="hint">Você recebe um link para entrar, sem precisar de senha.</span>
      </div>
      {state.status === "error" && (
        <div className="msg bad" role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className="btn pri" disabled={pending}>
        {pending ? "Enviando..." : "Receber link de acesso"}
      </button>
    </form>
  );
}
