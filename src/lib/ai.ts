import { GoogleGenAI } from '@google/genai';
import type { CuratedItem, CuratedSource } from './twitter';

const apiKey = process.env.GEMINI_API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });

const SOURCE_DESCRIPTIONS: Record<CuratedSource, string> = {
  x: 'tweets reais da comunidade #bolhadev no X (Twitter)',
  community: 'destaques reais da comunidade dev de hoje (Hacker News e DEV Community)',
};

const SECTION_LABELS: Record<CuratedSource, string> = {
  x: '🔥 Debates e Destaques da #bolhadev',
  community: '🔥 Destaques Quentes da Comunidade Dev',
};

const PLAIN_SECTION_LABELS: Record<CuratedSource, string> = {
  x: 'Destaques da #bolhadev',
  community: 'Destaques da Comunidade Dev',
};

/**
 * Resumo de emergência montado a partir dos itens REAIS da edição
 * (usado quando a chave Gemini não existe ou a cota foi atingida).
 * Nunca inventa conteúdo: lista exatamente o que foi coletado.
 */
function fallbackSummary(items: CuratedItem[], source: CuratedSource) {
  const bullets = items
    .slice(0, 10)
    .map(
      (item) =>
        `- **${item.text}** — @${item.author} · ❤️ ${item.likes} · 🔄 ${item.retweets}\n  [Abrir destaque](${item.url})`
    )
    .join('\n');

  const top = items
    .slice(0, 3)
    .map((item) => `*${item.text}* (por @${item.author})`)
    .join('\n');

  return {
    summaryWeb: `# 🗞️ BolhaDev Digest\n\n## ${SECTION_LABELS[source]}\n\n${bullets || '_Nenhum destaque disponível nesta edição._'}\n\n> ⚠️ Resumo por IA temporariamente indisponível (limite de cota ou chave) — segue a lista direta dos destaques de hoje.`,
    summaryWpp: `🤖 *BolhaDev Digest*\n\n🔥 *${PLAIN_SECTION_LABELS[source]}:*\n${top || 'Sem destaques hoje.'}`,
    summaryPush: `🔥 ${items.length} destaques do dia no BolhaDev Digest!`,
  };
}

export async function summarizeTweets(
  items: CuratedItem[],
  source: CuratedSource = 'community'
) {
  if (!apiKey) return fallbackSummary(items, source);

  const prompt = `
Você é o editor chefe do "BolhaDev Digest", uma newsletter diária de tecnologia.
A fonte desta edição é: ${SOURCE_DESCRIPTIONS[source]}.
Analise os itens abaixo e adicione também um panorama diário sobre **Novas Ferramentas do Mercado Tech**.

Regras editoriais obrigatórias:
- NUNCA transforme publicidade, autopromoção, divulgação de jogo, curso, sorteio, venda ou spam em destaque. Se um item for anúncio/selopromocional, simplesmente ignore-o.
- Em "Novas Ferramentas do Mercado Tech", cite APENAS ferramentas que apareçam explicitamente nos itens de referência abaixo. Não invente, não sugira e não cite de memória nenhum produto que não esteja nos itens. Se nenhum item citar ferramenta nova, escreva exatamente: "Nenhuma ferramenta nova citada hoje."

Produza três conteúdos distintos em Português do Brasil:
1. \`summaryWeb\`: Um resumo completo em Markdown dividido em seções atraentes:
   - ${SECTION_LABELS[source]}
   - 🛠️ **Novas Ferramentas do Mercado Tech** (apenas o que estiver nos itens de referência, pelas regras acima).
2. \`summaryWpp\`: Um resumo ultra-compacto formatado para WhatsApp, com tópicos diretos, emojis, sem markdown complexo (use asteriscos para negrito).
3. \`summaryPush\`: Uma frase curta e chamativa (máx 120 caracteres) para notificação push.

Itens de referência:
${JSON.stringify(items, null, 2)}

Responda EXATAMENTE em formato JSON puro, sem blocos de código markdown adicionais (como \`\`\`json), contendo exatamente estas três chaves:
{
  "summaryWeb": "...",
  "summaryWpp": "...",
  "summaryPush": "..."
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson) as Partial<{
      summaryWeb: string;
      summaryWpp: string;
      summaryPush: string;
    }>;

    if (!parsed.summaryWeb || !parsed.summaryWpp || !parsed.summaryPush) {
      throw new Error('Resposta da IA fora do formato esperado');
    }

    return {
      summaryWeb: parsed.summaryWeb,
      summaryWpp: parsed.summaryWpp,
      summaryPush: parsed.summaryPush,
    };
  } catch (error) {
    console.error('Erro ao gerar resumo com Gemini:', error);
    return fallbackSummary(items, source);
  }
}
