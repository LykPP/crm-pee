"use client";

import { useActionState } from "react";
import { loadExamples, removeExamples, type ExampleState } from "./actions";

export function ExampleButtons({ loaded }: { loaded: boolean }) {
  const [state, action, pending] = useActionState<ExampleState>(
    loaded ? removeExamples : loadExamples,
    {},
  );
  return (
    <form action={action} className="row">
      <button type="submit" className={loaded ? "btn" : "btn pri"} disabled={pending}>
        {pending
          ? loaded
            ? "Removendo..."
            : "Carregando..."
          : loaded
            ? "Remover dados de exemplo"
            : "Carregar dados de exemplo"}
      </button>
      {state.error && (
        <span className="msg bad" role="alert">
          {state.error}
        </span>
      )}
      {state.done && (
        <span className="msg ok" role="status">
          {state.done}
        </span>
      )}
    </form>
  );
}
