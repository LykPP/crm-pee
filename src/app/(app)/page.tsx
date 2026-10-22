import { ExampleButtons } from "./_examples/example-buttons";
import { requireMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const COUNTED = [
  ["clients", "Clientes"],
  ["projects", "Projetos"],
  ["interactions", "Interações"],
  ["calls", "Editais"],
  ["utilities", "Distribuidoras"],
] as const;

export default async function HomePage() {
  const { org, role } = await requireMembership();
  const supabase = await createClient();

  const counts = await Promise.all(
    COUNTED.map(async ([table]) => {
      const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
      return count ?? 0;
    }),
  );
  const { count: examples } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("is_example", true);

  return (
    <>
      <div className="head">
        <div>
          <h1>Início</h1>
          <p>As tarefas do dia chegam na etapa 12. Por enquanto, um resumo do banco.</p>
        </div>
      </div>
      <section className="box">
        <h4>O que {org.name} enxerga</h4>
        <div className="stats">
          {COUNTED.map(([table, label], i) => (
            <div key={table}>
              <b className="num">{counts[i]}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="help">
          Editais e distribuidoras de referência aparecem para todas as ESCOs. Clientes,
          projetos e interações são só de {org.name}.
        </p>
        {role === "admin" && <ExampleButtons loaded={Boolean(examples)} />}
      </section>
    </>
  );
}
