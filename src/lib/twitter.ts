// Fonte de conteúdo curado do BolhaDev Digest.
//
// Hierarquia de fontes, com fallback gracioso em cada nível:
// 1. Apify (`APIFY_API_TOKEN`) — tweets REAIS da #bolhadev via danek/twitter-scraper
//    (o único scraper top da store que permite API no plano free: 20 results/run,
//    US$0,0003/tweet ≈ US$0,11/mês no nosso uso, dentro dos US$5/mês do free).
// 2. APIs públicas e gratuitas (sem chave) — Hacker News (front page) + DEV Community
//    (artigos em alta do dia). Funcionam mesmo sem nenhuma configuração extra.
// 3. Nada disponível → lista vazia: a edição continua sendo gerada, sem conteúdo inventado.
//
// Todas as fontes passam pelo filtro de autopromoção/spam (applyCurationFilter)
// antes de virar edição — veja o bloco "Filtro de autopromoção" abaixo.

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

// ---------------------------------------------------------------------------
// Filtro de autopromoção / anúncios / spam
//
// Motivo: a hashtag #bolhadev é usada por alguns perfis para autopromover
// jogos, cursos e sorteios. Como o fallback (dias sem cota do Gemini) publica
// os itens BRUTOS, esses anúncios chegavam ao ar sem nenhuma revisão.
// O filtro roda na COLEÇÃO — antes de qualquer edição ser montada — e vale
// para todas as fontes (Apify/X, Hacker News e DEV Community).
//
// Configuração por env (com defaults razoáveis no código):
// - CURATION_BLOCKLIST: autores bloqueados, separados por vírgula (ex.: fabert_)
// - CURATION_FILTER_TERMS: termos promocionais (se definida, SUBSTITUI a lista default)
// - CURATION_MAX_PER_AUTHOR: máx. de itens por autor por edição (default: 2)
// ---------------------------------------------------------------------------

// Termos que caracterizam anúncio/autopromoção (match por palavra inteira).
const DEFAULT_PROMO_TERMS = [
  'rmt',
  'topidle',
  'heroesfarm',
  'gameonline',
  'mmorpg',
  'vamos fazer dinheiro',
  'giveaway',
  'sorteio',
];

function csvFromEnv(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function maxItemsPerAuthor(): number {
  const raw = Number(process.env.CURATION_MAX_PER_AUTHOR);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPromoItem(item: CuratedItem, blocked: Set<string>, terms: RegExp[]): boolean {
  if (blocked.has(item.author.toLowerCase())) return true;
  const text = item.text.toLowerCase();
  return terms.some((term) => term.test(text));
}

/**
 * Descarta itens promocionais/spam e limita quantos itens por autor entram
 * na edição, preservando a ordem original de chegada.
 */
export function applyCurationFilter(items: CuratedItem[]): CuratedItem[] {
  const blocked = new Set(csvFromEnv('CURATION_BLOCKLIST'));
  const configuredTerms = csvFromEnv('CURATION_FILTER_TERMS');
  const terms = (configuredTerms.length > 0 ? configuredTerms : DEFAULT_PROMO_TERMS).map(
    (term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i')
  );
  const perAuthor = maxItemsPerAuthor();
  const authorCounts = new Map<string, number>();
  const kept: CuratedItem[] = [];

  for (const item of items) {
    if (isPromoItem(item, blocked, terms)) continue;

    const key = item.author.toLowerCase();
    const count = (authorCounts.get(key) || 0) + 1;
    if (count > perAuthor) continue;
    authorCounts.set(key, count);
    kept.push(item);
  }

  if (kept.length < items.length) {
    console.warn(
      `Curadoria: ${items.length - kept.length} item(ns) descartado(s) por filtro de promo/spam ou limite por autor.`
    );
  }

  return kept;
}

/**
 * 1) Tweets reais da #bolhadev via Apify (danek/twitter-scraper).
 * Escolhido por combinação de confiança + plano free utilizável: 14,6M execuções/mês,
 * 100% de runs OK, US$0,0003/tweet no FREE e API liberada (limite de 20 results/run —
 * usamos 12). Alternativas premium: apidojo/tweet-scraper e apidojo/twitter-scraper-lite
 * (ambos ótimos, mas restringem o plano free a "demo, 5 runs/mês").
 */
async function fetchFromApify(): Promise<CuratedItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return [];

  const res = await fetch(
    `https://api.apify.com/v2/acts/danek~twitter-scraper/run-sync-get-dataset-items?token=${token}&timeout=45`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Input verificado ao vivo em 2026-09-23: query + busca "Latest" (o default
      // "Top" retorna os virais antigos e esgotaria os tweets novos nos dias seguintes).
      // No plano free o ator devolve no máximo 20 items/run (nosso slice limita a 12).
      body: JSON.stringify({ query: '#bolhadev', max_posts: 12, search_type: 'Latest' }),
      signal: AbortSignal.timeout(55_000),
    }
  );
  if (!res.ok) throw new Error(`Apify respondeu HTTP ${res.status}`);

  const data: unknown = await res.json();
  const list = Array.isArray(data) ? data : [];
  // Filtra promo/spam e aplica o limite por autor ANTES de cortar em 12 —
  // assim o corte sempre entrega até 12 itens válidos (quando houver).
  return applyCurationFilter(
    list
      .map(mapApifyTweet)
      .filter((item): item is CuratedItem => item !== null)
  ).slice(0, 12);
}

/**
 * Mapeia o output do danek (validado ao vivo em 2026-09-23):
 * { tweet_id, screen_name, text, favorites, retweets, created_at, ... } — sem campo
 * url, então montamos o link canônico do tweet. Mantemos as variantes clássicas da
 * Twitter API por tolerância a mudanças futuras do ator.
 */
function mapApifyTweet(raw: unknown): CuratedItem | null {
  const r = asRecord(raw);
  const text = str(r.text) || str(r.full_text) || str(r.fullText);
  const id = str(r.tweet_id) || str(r.id) || str(r.id_str) || str(r.idStr);
  if (!text || !id) return null; // sem id não há como deduplicar — descarta

  const author = asRecord(r.author);
  const user = asRecord(r.user);
  const screenName = str(r.screen_name);

  return {
    originalId: `x:${id}`,
    author: (
      screenName ||
      str(r.userName) ||
      str(r.username) ||
      str(author.userName) ||
      str(author.screen_name) ||
      str(user.screen_name) ||
      'bolhadev'
    ).replace(/^@/, ''),
    text,
    likes:
      num(r.favorites) ||
      num(r.likeCount) ||
      num(r.likes) ||
      num(r.like_count) ||
      num(r.favorite_count),
    retweets: num(r.retweets) || num(r.retweetCount) || num(r.retweet_count),
    url:
      str(r.url) ||
      str(r.twitterUrl) ||
      (screenName ? `https://x.com/${screenName}/status/${id}` : `https://x.com/i/status/${id}`),
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
      console.warn('Apify não retornou tweets válidos (vazios ou todos filtrados) — usando fonte comunitária.');
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

  // Mesmo filtro da fonte X: promo/spam e limite por autor nunca vão ao ar
  return { items: applyCurationFilter(items), source: 'community' };
}
