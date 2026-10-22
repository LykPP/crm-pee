import { describe, expect, it } from "vitest";
import { feedUrl, mergeNews, newsQueries, parseRss } from "./news";

// Shape of a Google News RSS search result.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<title>"chamada pública" "eficiência energética" - Google Notícias</title>
<item><title>Cemig abre chamada pública de R$ 150 milhões para eficiência energética - Agência Minas</title>
<link>https://news.google.com/rss/articles/CBMiAAA?oc=5</link><guid isPermaLink="false">CBMiAAA</guid>
<pubDate>Wed, 14 Oct 2026 13:05:00 GMT</pubDate>
<description>&lt;a href="https://news.google.com/rss/articles/CBMiAAA?oc=5"&gt;Cemig abre&lt;/a&gt;</description>
<source url="https://www.agenciaminas.mg.gov.br">Agência Minas</source></item>
<item><title><![CDATA[Light prorroga prazo da CPP &amp; divulga FAQ - Canal Energia]]></title>
<link>https://news.google.com/rss/articles/CBMiBBB?oc=5</link>
<pubDate>Mon, 20 Oct 2026 09:00:00 GMT</pubDate><source url="https://www.canalenergia.com.br">Canal Energia</source></item>
<item><title>Sem link</title></item>
</channel></rss>`;

describe("news feed", () => {
  it("reads title, link, source and date, dropping the publisher suffix", () => {
    expect(parseRss(SAMPLE)).toEqual([
      {
        title: "Cemig abre chamada pública de R$ 150 milhões para eficiência energética",
        link: "https://news.google.com/rss/articles/CBMiAAA?oc=5",
        source: "Agência Minas",
        publishedAt: "2026-10-14T13:05:00.000Z",
      },
      {
        title: "Light prorroga prazo da CPP & divulga FAQ",
        link: "https://news.google.com/rss/articles/CBMiBBB?oc=5",
        source: "Canal Energia",
        publishedAt: "2026-10-20T09:00:00.000Z",
      },
    ]);
  });

  it("merges feeds newest first without repeated headlines", () => {
    const items = parseRss(SAMPLE);
    const merged = mergeNews([items, [{ ...items[0], link: "https://other" }]], 10);
    expect(merged.map((n) => n.source)).toEqual(["Canal Energia", "Agência Minas"]);
  });

  it("searches the PEE and the organization's utilities", () => {
    const q = newsQueries(["Cemig D", "Light", "Light"]);
    expect(q[1]).toBe('"chamada pública" "eficiência energética" ("Cemig D" OR "Light") when:180d');
    expect(feedUrl(q[0])).toContain("hl=pt-BR");
    expect(newsQueries([])).toHaveLength(1);
  });
});
