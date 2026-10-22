"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/pee";

/** Changes the project stage as soon as another option is picked. */
export function StageSelect({
  stage,
  action,
  disabled,
}: {
  stage: Stage;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form className="row" onSubmit={(e) => e.preventDefault()}>
      <label className="small muted" htmlFor="stage">
        Etapa
      </label>
      <select
        id="stage"
        name="stage"
        className="btn"
        defaultValue={stage}
        disabled={disabled || pending}
        onChange={(e) => {
          const data = new FormData();
          data.set("stage", e.target.value);
          startTransition(() => formAction(data));
        }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="msg bad" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
