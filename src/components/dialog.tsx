"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A button that opens a modal window. `children` may be a function that
 * receives `close`, so forms can close the window after saving.
 */
export function Dialog({
  label,
  title,
  buttonClass = "btn",
  children,
}: {
  label: ReactNode;
  title: string;
  buttonClass?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={ref} onClose={close} aria-label={title}>
        {open && (
          <div className="dlg">
            <header>
              <h3>{title}</h3>
              <button type="button" className="btn ghost" onClick={close} aria-label="Fechar">
                Fechar
              </button>
            </header>
            {typeof children === "function" ? children(close) : children}
          </div>
        )}
      </dialog>
    </>
  );
}
