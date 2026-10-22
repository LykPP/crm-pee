"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import type { FormState } from "@/lib/forms";
import { MODALITY_LABELS } from "@/lib/messages";
import { STAGES, STAGE_LABELS, type Project } from "@/lib/pee";

export interface ClientOption {
  id: string;
  name: string;
  typology: string | null;
  modality: "fp" | "cd" | null;
  municipality: string | null;
}

export interface CallOption {
  id: string;
  label: string;
  code: string;
  typologies: string[];
  /** [level, description] pairs from the call's avoided costs. */
  levels: [string, string][];
}

const FALLBACK_LEVELS: [string, string][] = [
  ["A4", "A4"],
  ["B3", "B3"],
  ["B4", "B4"],
];

const FLAGS: [keyof Project, string][] = [
  ["is_micro_small_business", "Proponente é ME/EPP"],
  ["has_non_removable_uses", "Inclui usos finais não removíveis"],
  ["is_heritage_listed", "Imóvel tombado (patrimônio)"],
  ["has_incentivized_source", "Inclui fonte incentivada (FV)"],
  ["requires_public_bidding", "Cliente público precisa licitar"],
];

function Fields({
  clients,
  calls,
  project,
  defaultClientId,
  defaultCallId,
  fallbackTypologies,
}: {
  clients: ClientOption[];
  calls: CallOption[];
  project?: Project & { client_id: string };
  defaultClientId?: string;
  defaultCallId?: string;
  fallbackTypologies: string[];
}) {
  const initialClient = clients.find((c) => c.id === (project?.client_id ?? defaultClientId));
  const initialCall = calls.find((c) => c.id === (project ? project.call_id : defaultCallId));
  const [clientId, setClientId] = useState(initialClient?.id ?? "");
  const [callId, setCallId] = useState(initialCall?.id ?? "");
  const [name, setName] = useState(
    project?.name ?? (initialClient ? `${initialClient.name} · ${initialCall?.code ?? ""}` : ""),
  );
  const [typology, setTypology] = useState(project?.typology ?? initialClient?.typology ?? "");
  const [modality, setModality] = useState<string>(project?.modality ?? initialClient?.modality ?? "fp");
  const [municipality, setMunicipality] = useState(project?.municipality ?? initialClient?.municipality ?? "");

  const call = calls.find((c) => c.id === callId);
  const typologies = call?.typologies.length ? call.typologies : fallbackTypologies;
  const levels = call?.levels.length ? call.levels : FALLBACK_LEVELS;

  // Choosing a client on a new project brings its likely typology, modality and town.
  const pickClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (project || !c) return;
    if (!name.trim() || clients.some((x) => name.startsWith(`${x.name} · `))) {
      setName(`${c.name} · ${call?.code ?? ""}`);
    }
    if (c.typology) setTypology(c.typology);
    if (c.modality) setModality(c.modality);
    if (c.municipality) setMunicipality(c.municipality);
  };

  return (
    <div className="fgrid">
      <div className="field full">
        <label htmlFor="pj-name">Nome do projeto</label>
        <input id="pj-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pj-client">Cliente</label>
        <select id="pj-client" name="client_id" required value={clientId} onChange={(e) => pickClient(e.target.value)}>
          <option value="" disabled>
            Escolha
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pj-call">Edital</label>
        <select id="pj-call" name="call_id" value={callId} onChange={(e) => setCallId(e.target.value)}>
          <option value="">—</option>
          {calls.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pj-typ">Tipologia</label>
        <select id="pj-typ" name="typology" value={typology} onChange={(e) => setTypology(e.target.value)}>
          <option value="">—</option>
          {typologies.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pj-mod">Modalidade</label>
        <select id="pj-mod" name="modality" value={modality} onChange={(e) => setModality(e.target.value)}>
          {Object.entries(MODALITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pj-level">Nível de tensão (maior entre as UCs)</label>
        <select id="pj-level" name="voltage_level" defaultValue={project?.voltage_level ?? "A4"}>
          {levels.map(([level, desc]) => (
            <option key={level} value={level}>
              {level === desc ? level : `${level} · ${desc}`}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pj-mun">Município</label>
        <input
          id="pj-mun"
          name="municipality"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pj-resp">Responsável na ESCO</label>
        <input id="pj-resp" name="responsible" defaultValue={project?.responsible ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="pj-stage">Etapa</label>
        <select id="pj-stage" name="stage" defaultValue={project?.stage ?? "prospecting"}>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {FLAGS.map(([key, label]) => (
        <label key={key} className="field check full">
          <input type="checkbox" name={key} defaultChecked={Boolean(project?.[key])} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function ProjectFormDialog({
  label,
  title,
  action,
  buttonClass,
  extraFooter,
  ...fields
}: {
  label: string;
  title: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  buttonClass?: string;
  extraFooter?: React.ReactNode;
  clients: ClientOption[];
  calls: CallOption[];
  project?: Project & { client_id: string };
  defaultClientId?: string;
  defaultCallId?: string;
  fallbackTypologies: string[];
}) {
  return (
    <FormDialog label={label} title={title} action={action} buttonClass={buttonClass} extraFooter={extraFooter}>
      <Fields {...fields} />
    </FormDialog>
  );
}
