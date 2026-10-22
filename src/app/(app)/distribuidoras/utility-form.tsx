"use client";

import { FormDialog } from "@/components/form-dialog";
import type { UtilityRow } from "@/lib/data/reference";
import type { FormState } from "@/lib/forms";

export function UtilityFormDialog({
  label,
  title,
  action,
  utility,
  buttonClass,
}: {
  label: string;
  title: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  utility?: UtilityRow;
  buttonClass?: string;
}) {
  const field = (name: keyof UtilityRow, text: string, type = "text", full = false) => (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={`u-${name}`}>{text}</label>
      <input
        id={`u-${name}`}
        name={name}
        type={type}
        required={name === "name"}
        defaultValue={(utility?.[name] as string | null) ?? ""}
      />
    </div>
  );
  return (
    <FormDialog label={label} title={title} action={action} buttonClass={buttonClass}>
      <div className="fgrid">
        {field("name", "Nome", "text", true)}
        {field("short_name", "Sigla curta")}
        {field("state", "UF")}
        {field("concession_area", "Área de concessão", "text", true)}
        {field("website", "Site", "url")}
        {field("pee_email", "E-mail do PEE", "email")}
        {field("submission_url", "Sistema de submissão", "url", true)}
        {field("address", "Endereço", "text", true)}
      </div>
    </FormDialog>
  );
}
