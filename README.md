<div align="center">

# 📰 BolhaDev Digest

**Newsletter inteligente de tecnologia: curadoria automática, resumo por IA e disparo multicanal — todo dia, sem você tocar em nada.**

[![Em produção](https://img.shields.io/badge/Em%20produção-Vercel-000000?logo=vercel&logoColor=white)](https://bolhadev-digest-machado15.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?logo=neon&logoColor=black)](https://neon.tech)
[![Vercel Cron](https://img.shields.io/badge/Vercel-Cron%20server--side-000000?logo=vercel&logoColor=white)](https://vercel.com/docs/cron-jobs)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-instalável-5A0FC8?logo=pwa&logoColor=white)](#-leitor-web-pwa)

Uma edição diária · três resumos gerados por IA · **Telegram, WhatsApp e Push** · leitor PWA

</div>

---

## ✨ Por que este projeto?

- 🤖 **100% automático** — um cron server-side na Vercel gera e envia a edição todo dia no horário que você escolher, mesmo com o navegador fechado e o computador desligado.
- 🧠 **Resumo com IA** — o Gemini transforma os destaques do dia em **três formatos**: Markdown para o leitor web, texto compacto para WhatsApp e uma frase de impacto para notificação push.
- 📡 **Disparo multicanal com resultado real** — Telegram, Web Push e webhook de WhatsApp respondem **cada um com seu status**: nada de "sucesso" falso.
- 🔐 **Cron protegido** — o endpoint de geração exige `Authorization: Bearer $CRON_SECRET` (a Vercel injeta o header automaticamente) e tem **dedupe diário**: no máximo uma edição por dia.
- 🗄️ **Postgres serverless** — Neon (free tier) com pool de conexões, pronto para produção.
- 📱 **Leitor PWA** — instala no celular/desktop, tema escuro, histórico das edições.
- 🔌 **Fontes em camadas, sem conteúdo inventado** — tweets reais da **#bolhadev** via Apify quando você configura o token; senão, destaques **reais e gratuitos** de Hacker News + DEV Community; se tudo falhar, a edição sai sem os cards — nunca com dados falsos.

## 🏗️ Arquitetura

```mermaid
flowchart TD
    CRON["⏰ Vercel Cron · 24 horários (1/dia cada)"] -->|"Authorization: Bearer CRON_SECRET"| API
    UI["🔘 Botão «Gerar Edição»"] -->|POST| API
    WATCH["👁️ SchedulerWatcher local"] -->|POST mode=auto| API

    API["/api/cron/generate<br/>janela de horário (BRT) + dedupe diário"]

    API --> SRC{"🔍 Melhor fonte do dia"}
    SRC -->|"APIFY_API_TOKEN"| X["Tweets reais da #bolhadev<br/>(Apify · apidojo/tweet-scraper)"]
    SRC -->|"sem token / falha"| COMM["Hacker News front page<br/>+ DEV Community em alta<br/>(APIs gratuitas, sem chave)"]

    X --> AI["🧠 Gemini<br/>summaryWeb · summaryWpp · summaryPush"]
    COMM --> AI

    AI --> DB[("🗄️ Neon Postgres<br/>Newsletter + Tweets")]
    AI --> TG["✈️ Telegram Bot"]
    AI --> PUSH["🔔 Web Push (VAPID)"]
    AI --> WA["💬 Webhook WhatsApp"]
    DB -->|lastAutoSentDate| API
```

## 📦 Stack

| Camada | Tecnologia |
|---|---|
| Frontend & PWA | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, Lucide Icons |
| Linguagem | TypeScript 5 (strict) |
| Banco & ORM | **Neon Postgres** + Prisma 6 |
| IA | Google Gemini (`gemini-3.6-flash`) com fallback offline baseado nos itens reais |
| Agendamento | Vercel Cron (24 jobs horários) + janela de horário e dedupe na rota |
| Canais | Telegram Bot API · Web Push (VAPID) · webhook de WhatsApp |
| Deploy | Vercel (build `prisma generate && next build`), GitHub auto-deploy |

## 🚀 Início rápido

```bash
# 1. Dependências
npm install

# 2. Banco (Postgres/Neon — crie uma database grátis em https://neon.tech)
npx prisma db push

# 3. Variáveis de ambiente (crie o .env a partir do exemplo)
cp .env.example .env

# 4. Desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), clique em **«Gerar Edição Agora»** e veja a edição nascer.

### 🧰 Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm run lint` | ESLint |
| `npx prisma studio` | GUI do banco |
| `node scripts/e2e-cron.mjs` | Teste E2E do cron (auth, envio real, dedupe) com limpeza automática |
| `node scripts/cleanup-test-data.mjs` | Remove edições de teste |
| `node scripts/migrate-sqlite-to-neon.mjs` | Migração ponta a ponta SQLite → Neon |

## ⚙️ Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | String de conexão Postgres do **Neon** (use a *pooled*) |
| `GEMINI_API_KEY` | ✅ | Chave do [Google AI Studio](https://aistudio.google.com/) (free tier: 20 req/dia) |
| `CRON_SECRET` | ✅ (produção) | Segredo do cron — gere com `openssl rand -hex 32` |
| `TELEGRAM_BOT_TOKEN` | ✅ | Token do bot ([@BotFather](https://t.me/BotFather)) |
| `TELEGRAM_CHAT_ID` | ✅ | ID do canal/grupo de destino |
| `SCHEDULE_TIME` | ⭕ | Horário padrão do envio (ex.: `09:17`, fuso de Brasília) |
| `AUTO_SCHEDULE` | ⭕ | `true` ativa o agendamento automático |
| `APIFY_API_TOKEN` | ⭕ | **Tweets reais da #bolhadev** via [Apify](https://apify.com) (`apidojo/tweet-scraper`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | ⭕ | Web Push — gere com `npx web-push generate-vapid-keys` |
| `WHATSAPP_WEBHOOK_URL` | ⭕ | Webhook que recebe o resumo de WhatsApp |

> As configurações salvas na UI (painel **Configurações**) prevalecem sobre as variáveis de ambiente.

## 🕐 Como o agendamento funciona

1. O `vercel.json` declara **24 jobs horários** (`0 H * * *`) — no plano Hobby cada job roda **uma vez por dia**, então um job por hora garante cobertura total.
2. A rota `GET /api/cron/generate` valida a **hora de Brasília** contra o `scheduleTime` e o **dedupe diário** (`lastAutoSentDate`) → **exatamente uma edição por dia**, na janela certa.
3. Autenticação: header `Authorization: Bearer $CRON_SECRET` (a Vercel envia sozinha quando a env var existe; chamadas sem token recebem `401`).
4. `POST /api/cron/generate` dispara manualmente pela UI ou pelo watcher local (`mode: "auto"`).

## 📡 Canais

- **✈️ Telegram** — bot próprio; envio com `parse_mode` e *fallback* para texto puro se o Markdown falhar.
- **🔔 Web Push** — inscrição pelo leitor PWA com chaves VAPID.
- **💬 WhatsApp** — POST para o seu webhook (Evolution API / Baileys) com o resumo formatado.
- **🧪 Teste sem disparar tudo** — o painel de Configurações tem botão de teste por canal (`POST /api/settings/test`).

## 🗂️ Estrutura

```
src/
├── app/
│   ├── page.tsx              # leitor da edição + cards de destaque
│   ├── settings/             # painel: horário, canais, teste de envio
│   └── api/
│       ├── cron/generate/    # GET (cron, protegido) · POST (manual/watcher)
│       ├── settings/         # configurações + teste por canal
│       └── push/             # inscrição de Web Push
├── components/               # GenerateButton, SchedulerWatcher, login WhatsApp
└── lib/
    ├── twitter.ts            # fontes em camadas: Apify → HN + DEV → vazio
    ├── ai.ts                 # Gemini + fallback real sem IA
    ├── notifier.ts           # Telegram · Push · WhatsApp (resultado por canal)
    ├── settings.ts           # config: banco primeiro, env como fallback
    └── prisma.ts
prisma/schema.prisma          # Newsletter · Tweet · Settings · PushSubscription
vercel.json                   # 24 crons horários
scripts/                      # e2e-cron · cleanup · migração SQLite→Neon
```

## 🚢 Deploy

O repositório está conectado à Vercel: **`git push` no `main` deploya sozinho**.

1. Crie o projeto na Vercel e configure as variáveis acima (Environment Variables → **Production**).
2. Garanta que **Settings → Deployment Protection** está desligado para *Production* (senão o site e o cron caem na página de login da Vercel).
3. Confirme os crons em **Settings → Cron Jobs** (o botão *Run* permite um teste manual) — os logs de cada execução ficam em **Observability**.

---

<div align="center">
<sub>BolhaDev Digest · feito com Next.js, Prisma, Neon, Gemini e muito ☕</sub>
</div>
