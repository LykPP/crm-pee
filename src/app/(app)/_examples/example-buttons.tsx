"use client";

import { useActionState } from "react";
import { loadExamples, removeExamples, type ExampleState } from "./actions";

// One action for both buttons, so the result message survives the switch
// from "Carregar" to "Remover" when the page refreshes.
async function run(_prev: ExampleState, form: FormData) {
  return form.get("mode") === "remove" ? removeExamples() : loadExamples();
}

export function ExampleButtons({ loaded }: { loaded: boolean }) {
  const [state, action, pending] = useActionState<ExampleState, FormData>(run, {});
  return (
    <form action={action} className="row">
      <input type="hidden" name="mode" value={loaded ? "remove" : "load"} />
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
