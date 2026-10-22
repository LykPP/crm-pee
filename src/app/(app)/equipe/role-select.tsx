"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { ROLE_LABELS, type MemberRole } from "@/lib/session-labels";

/** Changes a member's role as soon as another option is picked. */
export function RoleSelect({
  role,
  action,
}: {
  role: MemberRole;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <span className="inline-action">
      <select
        className="kselect"
        aria-label="Papel"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const data = new FormData();
          data.set("role", e.target.value);
          startTransition(() => formAction(data));
        }}
        style={{ width: "auto" }}
      >
        {Object.entries(ROLE_LABELS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="msg bad" role="alert">
          {state.error}
        </span>
      )}
    </span>
  );
}
