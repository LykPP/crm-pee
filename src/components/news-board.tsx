import { searchCallsUrl } from "@/lib/labels";
import { fetchNews } from "@/lib/news";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

/** Latest news about calls for projects, refreshed at most hourly. */
export async function NewsBoard({ utilityNames }: { utilityNames: string[] }) {
  const { items, failed } = await fetchNews(utilityNames);
  return (
    <section className="box">
      <div className="sec">
        <h3>Notícias de chamadas públicas</h3>
        <span className="help">Google Notícias · atualiza a cada hora</span>
      </div>
      {items.length ? (
        <div className="list">
          {items.map((n) => (
            <a key={n.link} className="item news" href={n.link} target="_blank" rel="noopener">
              <div className="grow">
                <div className="t">{n.title}</div>
                <div className="s">
                  {[n.source, n.publishedAt && DATE.format(new Date(n.publishedAt))].filter(Boolean).join(" · ")}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="help">
          {failed ? "Não foi possível carregar as notícias agora." : "Nenhuma notícia recente encontrada."}
        </p>
      )}
      <div className="row">
        <span className="help">Procurar na web:</span>
        {utilityNames.map((n) => (
          <a key={n} className="btn sm" target="_blank" rel="noopener" href={searchCallsUrl(n)}>
            {n}
          </a>
        ))}
      </div>
    </section>
  );
}

export function NewsBoardLoading() {
  return (
    <section className="box">
      <h3>Notícias de chamadas públicas</h3>
      <p className="help">Carregando notícias...</p>
    </section>
  );
}
