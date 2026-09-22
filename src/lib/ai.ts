import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });

export async function fetchTechNewsAndTweets() {
  // Tweets populares da #bolhadev + Novas Ferramentas Tech do Mercado
  const mockTweets = [
    {
      originalId: '19000000000000001',
      author: 'midudev',
      text: 'TypeScript 5.8 lançado com melhorias incríveis de performance e checagem de tipos mais rápida. #bolhadev',
      likes: 452,
      retweets: 67,
      url: 'https://twitter.com/midudev/status/19000000000000001'
    },
    {
      originalId: '19000000000000002',
      author: 'dan_abramov',
      text: 'O ecossistema de Server Components está mudando a forma como construímos aplicações web em 2026. #bolhadev',
      likes: 890,
      retweets: 120,
      url: 'https://twitter.com/dan_abramov/status/19000000000000002'
    },
    {
      originalId: '19000000000000003',
      author: 'felipe_dev',
      text: 'Galera, testando a nova ferramenta Drizzle Studio para SQLite, a produtividade com banco de dados disparou! #bolhadev',
      likes: 230,
      retweets: 18,
      url: 'https://twitter.com/felipe_dev/status/19000000000000003'
    }
  ];

  return mockTweets;
}

export async function summarizeTweets(tweets: Array<{ author: string; text: string; likes: number; retweets: number; url: string }>) {
  if (!apiKey) {
    return {
      summaryWeb: `# 🗞️ BolhaDev Digest & Mercado Tech\n\nNenhuma chave Gemini configurada.\n\n## 🛠️ Novas Ferramentas do Mercado Tech\n- **Drizzle Studio v0.35**: Nova interface visual para gerenciamento de bancos de dados SQLite/Postgres.\n- **Bun v1.2**: Runtime JavaScript ultrarrápido consolidado no mercado.`,
      summaryWpp: `🤖 *BolhaDev Digest & Tech News*\n\n🔥 *#bolhadev:* Discussões sobre TypeScript 5.8 e Server Components.\n\n🛠️ *Novas Ferramentas:* Drizzle Studio e Bun v1.2 em alta!`,
      summaryPush: `Novo resumo da #bolhadev e Mercado Tech disponível!`
    };
  }

  const prompt = `
Você é o editor chefe do "BolhaDev Digest", uma newsletter diária sobre a comunidade #bolhadev e novidades do mercado de tecnologia.
Analise os seguintes tweets e adicione também um panorama diário sobre **Novas Ferramentas do Mercado Tech** (lançamentos recentes de frameworks, bibliotecas, IAs ou ferramentas de desenvolvimento).

Produza três conteúdos distintos em Português do Brasil:
1. \`summaryWeb\`: Um resumo completo em Markdown dividido em seções atraentes:
   - 🔥 **Debates e Destaques da #bolhadev**
   - 🛠️ **Novas Ferramentas do Mercado Tech** (destaque 2 a 3 ferramentas/tecnologias que estão bombando hoje no mercado mundial).
2. \`summaryWpp\`: Um resumo ultra-compacto formatado para WhatsApp, com tópicos diretos, emojis, sem markdown complexo (use asteriscos para negrito).
3. \`summaryPush\`: Uma frase curta e chamativa (máx 120 caracteres) para notificação push.

Tweets de referência:
${JSON.stringify(tweets, null, 2)}

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
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Erro ao gerar resumo com Gemini:', error);
    return {
      summaryWeb: `# 🗞️ BolhaDev Digest & Mercado Tech\n\n- **TypeScript 5.8** e **Server Components** dominam as conversas na #bolhadev.\n\n## 🛠️ Novas Ferramentas do Mercado Tech\n- **Drizzle Studio**: Interface moderna para inspeção de banco de dados.\n- **Bun**: Performance extrema para servidores Node/TS.`,
      summaryWpp: `🤖 *BolhaDev Digest & Tech News*\n\n🔥 *Destaques #bolhadev:* TypeScript 5.8 e Server Components.\n\n🛠️ *Ferramentas do Dia:* Drizzle Studio e Bun.`,
      summaryPush: `Novo resumo da #bolhadev e Tech News gerado!`
    };
  }
}
