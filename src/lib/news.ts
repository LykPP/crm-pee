/**
 * News about calls for projects, read from Google News RSS searches.
 * Results are cached for an hour, so each visit shows fresh news without
 * hitting the source on every page view. No API key is needed; for the
 * commercial phase this can be swapped for a licensed news API.
 */

export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  publishedAt: string | null;
}

const FEED = "https://news.google.com/rss/search";
const REFRESH_SECONDS = 3600;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
    .trim();
}

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
}

/** Reads the items of an RSS 2.0 document. */
export function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = m[1];
    const link = tag(raw, "link");
    let title = tag(raw, "title");
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    const source = tag(raw, "source");
    // Google News appends " - Publisher" to every title.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -source.length - 3);
    const date = tag(raw, "pubDate");
    const parsed = date ? new Date(date) : null;
    items.push({
      title,
      link,
      source,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    });
  }
  return items;
}

/** Search terms: the PEE in general and calls of the utilities the organization works with. */
export function newsQueries(utilityNames: string[]) {
  const names = [...new Set(utilityNames.filter(Boolean))].map((n) => `"${n}"`);
  const queries = ['"Programa de Eficiência Energética" ANEEL "chamada pública" when:180d'];
  if (names.length) {
    queries.push(`"chamada pública" "eficiência energética" (${names.join(" OR ")}) when:180d`);
  }
  return queries;
}

export function feedUrl(query: string) {
  const params = new URLSearchParams({ q: query, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" });
  return `${FEED}?${params}`;
}

/** Merges feeds, drops repeated headlines and keeps the most recent. */
export function mergeNews(lists: NewsItem[][], limit: number) {
  const seen = new Set<string>();
  const key = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  return lists
    .flat()
    .filter((n) => {
      const k = key(n.title);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}

export async function fetchNews(utilityNames: string[], limit = 8) {
  const results = await Promise.allSettled(
    newsQueries(utilityNames).map(async (q) => {
      const res = await fetch(feedUrl(q), {
        next: { revalidate: REFRESH_SECONDS },
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (Painel PEE)" },
      });
      if (!res.ok) throw new Error(`News feed answered ${res.status}`);
      return parseRss(await res.text());
    }),
  );
  const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  for (const r of results) if (r.status === "rejected") console.error("News feed failed", r.reason);
  return { items: mergeNews(ok, limit), failed: ok.length === 0 };
}
