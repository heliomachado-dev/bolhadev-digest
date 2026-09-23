// Fonte de conteúdo curado do BolhaDev Digest.
//
// Hierarquia de fontes, com fallback gracioso em cada nível:
// 1. Apify (`APIFY_API_TOKEN`) — tweets REAIS da #bolhadev via apidojo/tweet-scraper.
// 2. APIs públicas e gratuitas (sem chave) — Hacker News (front page) + DEV Community
//    (artigos em alta do dia). Funcionam mesmo sem nenhuma configuração extra.
// 3. Nada disponível → lista vazia: a edição continua sendo gerada, sem conteúdo inventado.

export type CuratedItem = {
  originalId: string;
  author: string;
  text: string;
  likes: number;
  retweets: number;
  url: string;
};

export type CuratedSource = 'x' | 'community';

export type CuratedContent = {
  items: CuratedItem[];
  source: CuratedSource;
};

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

/** 1) Tweets reais da #bolhadev via Apify (apidojo/tweet-scraper). */
async function fetchFromApify(): Promise<CuratedItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return [];

  const res = await fetch(
    `https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${token}&timeout=45`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerms: ['#bolhadev'], maxItems: 12, sort: 'Latest' }),
      signal: AbortSignal.timeout(55_000),
    }
  );
  if (!res.ok) throw new Error(`Apify respondeu HTTP ${res.status}`);

  const data: unknown = await res.json();
  const list = Array.isArray(data) ? data : [];
  return list
    .map(mapApifyTweet)
    .filter((item): item is CuratedItem => item !== null)
    .slice(0, 12);
}

/** Mapeamento tolerante: o schema de saída do ator pode mudar entre versões. */
function mapApifyTweet(raw: unknown, index: number): CuratedItem | null {
  const r = asRecord(raw);
  const text = str(r.text) || str(r.full_text) || str(r.fullText);
  if (!text) return null;

  const author = asRecord(r.author);
  const user = asRecord(r.user);
  const id = str(r.id) || str(r.id_str) || `idx-${index}`;

  return {
    originalId: `x:${id}`,
    author: (
      str(r.author) ||
      str(r.userName) ||
      str(r.username) ||
      str(author.userName) ||
      str(author.screen_name) ||
      str(user.screen_name) ||
      'bolhadev'
    ).replace(/^@/, ''),
    text,
    likes: num(r.likeCount) || num(r.likes) || num(r.like_count) || num(r.favorite_count),
    retweets: num(r.retweetCount) || num(r.retweets) || num(r.retweet_count),
    url:
      str(r.url) ||
      (str(r.id) ? `https://x.com/i/status/${str(r.id)}` : 'https://x.com/hashtag/bolhadev'),
  };
}

/** 2a) Hacker News — front page (API pública do Algolia, sem chave). */
async function fetchHnHighlights(): Promise<CuratedItem[]> {
  const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=6', {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Hacker News respondeu HTTP ${res.status}`);

  const data = asRecord(await res.json());
  const hits = Array.isArray(data.hits) ? data.hits : [];

  return hits
    .map((hit) => {
      const h = asRecord(hit);
      const title = str(h.title);
      if (!title) return null;
      const id = str(h.objectID);
      return {
        originalId: `hn:${id}`,
        author: str(h.author) || 'news',
        text: title,
        likes: num(h.points),
        retweets: num(h.num_comments),
        // Postagens sem link externo (Ask/Show HN) caem na discussão no HN
        url: str(h.url) || `https://news.ycombinator.com/item?id=${id}`,
      } satisfies CuratedItem;
    })
    .filter((item): item is CuratedItem => item !== null);
}

/** 2b) DEV Community — artigos em alta do dia (API pública, sem chave). */
async function fetchDevtoHighlights(): Promise<CuratedItem[]> {
  const res = await fetch('https://dev.to/api/articles?top=1&per_page=5', {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`DEV Community respondeu HTTP ${res.status}`);

  const data: unknown = await res.json();
  const list = Array.isArray(data) ? data : [];

  return list
    .map((raw) => {
      const a = asRecord(raw);
      const title = str(a.title);
      if (!title) return null;
      const user = asRecord(a.user);
      return {
        originalId: `dev:${str(a.id)}`,
        author: str(user.username) || 'dev',
        text: title,
        likes: num(a.public_reactions_count) || num(a.positive_reactions_count),
        retweets: num(a.comments_count),
        url: str(a.url) || 'https://dev.to',
      } satisfies CuratedItem;
    })
    .filter((item): item is CuratedItem => item !== null);
}

/**
 * Busca o conteúdo curado do dia usando a melhor fonte disponível:
 * - Com `APIFY_API_TOKEN`: tweets reais da #bolhadev (X).
 * - Sem token (ou se o Apify falhar): destaques reais da comunidade dev
 *   (Hacker News + DEV Community), intercalados.
 * - Se tudo falhar: lista vazia — nunca inventamos conteúdo.
 */
export async function fetchCuratedContent(): Promise<CuratedContent> {
  if (process.env.APIFY_API_TOKEN) {
    try {
      const tweets = await fetchFromApify();
      if (tweets.length > 0) return { items: tweets, source: 'x' };
      console.warn('Apify não retornou tweets — usando fonte comunitária.');
    } catch (error) {
      console.warn(
        'Falha ao buscar tweets no Apify — usando fonte comunitária:',
        error instanceof Error ? error.message : error
      );
    }
  }

  const [hn, devto] = await Promise.allSettled([fetchHnHighlights(), fetchDevtoHighlights()]);

  if (hn.status === 'rejected') {
    console.warn(
      'Hacker News indisponível:',
      hn.reason instanceof Error ? hn.reason.message : hn.reason
    );
  }
  if (devto.status === 'rejected') {
    console.warn(
      'DEV Community indisponível:',
      devto.reason instanceof Error ? devto.reason.message : devto.reason
    );
  }

  const hnItems = hn.status === 'fulfilled' ? hn.value : [];
  const devItems = devto.status === 'fulfilled' ? devto.value : [];

  // Intercala as duas fontes para variar os cards da edição
  const items: CuratedItem[] = [];
  for (let i = 0; i < Math.max(hnItems.length, devItems.length); i++) {
    if (hnItems[i]) items.push(hnItems[i]);
    if (devItems[i]) items.push(devItems[i]);
  }

  return { items, source: 'community' };
}
