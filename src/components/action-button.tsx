"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";

/** A one-click server action, with optional confirmation and inline error. */
export function ActionButton({
  action,
  label,
  pendingLabel = "Aguarde...",
  confirm,
  className = "btn",
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-action"
    >
      <button type="submit" className={className} disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
      {state.error && (
        <span className="msg bad" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
