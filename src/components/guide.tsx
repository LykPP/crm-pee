"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "painel-pee:guide";

const STEPS: [string, string, string][] = [
  ["Escolha o edital", "Em Editais estão os prazos e o que cada chamada exige.", "/editais"],
  ["Cadastre o cliente", "Quem recebe o projeto: hospital, prefeitura, indústria.", "/clientes"],
  ["Crie o projeto", "Ligue cliente e edital. O checklist de documentos aparece sozinho.", "/projetos"],
  ["Siga o próximo passo", "Cada projeto mostra o que falta fazer agora.", "/pipeline"],
];

/** First steps, as in the prototype; each viewer can hide it on their device. */
export function Guide() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "off");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="guide">
      <button
        type="button"
        className="btn sm ghost x"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, "off");
          } catch {
            // Storage may be blocked; hiding for this visit is enough.
          }
        }}
      >
        Ocultar
      </button>
      {STEPS.map(([title, text, href], i) => (
        <Link key={title} href={href}>
          <em>{i + 1}</em>
          <b>{title}</b>
          <span>{text}</span>
        </Link>
      ))}
    </div>
  );
}
