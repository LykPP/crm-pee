"use client";

import { startTransition, useActionState, useEffect, useId, type ReactNode } from "react";
import type { FormState } from "@/lib/forms";
import { Dialog } from "./dialog";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

function Body({
  action,
  close,
  submitLabel,
  extraFooter,
  children,
}: {
  action: Action;
  close: () => void;
  submitLabel: string;
  extraFooter?: ReactNode;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formId = useId();
  useEffect(() => {
    if (state.ok) close();
  }, [state, close]);

  return (
    // The footer sits outside the form so extra buttons may carry their own forms.
    <div className="dlg-form">
      <form
        id={formId}
        className="body"
        // Submitting by hand keeps what was typed when the server returns an
        // error; React resets forms that use the action prop.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {children}
        {state.error && (
          <p className="msg bad" role="alert">
            {state.error}
          </p>
        )}
      </form>
      <footer>
        {extraFooter}
        <span className="grow" />
        <button type="button" className="btn" onClick={close}>
          Cancelar
        </button>
        <button type="submit" form={formId} className="btn pri" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </button>
      </footer>
    </div>
  );
}

/** A button that opens a form in a modal window and closes it on success. */
export function FormDialog({
  label,
  title,
  action,
  buttonClass,
  submitLabel = "Salvar",
  extraFooter,
  children,
}: {
  label: ReactNode;
  title: string;
  action: Action;
  buttonClass?: string;
  submitLabel?: string;
  extraFooter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog label={label} title={title} buttonClass={buttonClass}>
      {(close) => (
        <Body action={action} close={close} submitLabel={submitLabel} extraFooter={extraFooter}>
          {children}
        </Body>
      )}
    </Dialog>
  );
}
