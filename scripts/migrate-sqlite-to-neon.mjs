// Migra os dados do SQLite local (prisma/dev.db) para o Postgres (Neon).
// Roda com: node --env-file=.env scripts/migrate-sqlite-to-neon.mjs
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlite = new DatabaseSync(path.join(root, 'prisma', 'dev.db'), { readOnly: true });
const prisma = new PrismaClient();

function read(table) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all();
}

// Prisma/SQLite pode gravar DateTime como string ISO ou epoch ms
function toDate(value, context) {
  if (value == null) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida em ${context}: ${JSON.stringify(value)}`);
  }
  return parsed;
}

const toStr = (value, fallback = '') => (value == null ? fallback : String(value));
const toBool = (value) => value === 1 || value === true;

async function main() {
  const raw = {
    Settings: read('Settings'),
    Newsletter: read('Newsletter'),
    Tweet: read('Tweet'),
    PushSubscription: read('PushSubscription'),
  };
  console.log('Origem (SQLite):', JSON.stringify(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.length]))));
  console.log(
    'Amostra de date no SQLite:',
    raw.Newsletter[0] ? JSON.stringify(raw.Newsletter[0].date) : '(sem newsletters)'
  );

  // 1. Settings (upsert → reexecução segura)
  for (const row of raw.Settings) {
    const data = {
      whatsappNumber: toStr(row.whatsappNumber),
      whatsappWebhook: toStr(row.whatsappWebhook),
      telegramChatId: toStr(row.telegramChatId),
      telegramToken: toStr(row.telegramToken),
      autoSchedule: toBool(row.autoSchedule),
      scheduleTime: toStr(row.scheduleTime, '07:00'),
      lastAutoSentDate: toStr(row.lastAutoSentDate),
      updatedAt: toDate(row.updatedAt, 'Settings.updatedAt'),
    };
    await prisma.settings.upsert({
      where: { id: toStr(row.id, 'default') },
      update: data,
      create: { id: toStr(row.id, 'default'), ...data },
    });
  }

  // 2. Newsletters (pais) → 3. Tweets (filhas, FK newsletterId)
  if (raw.Newsletter.length > 0) {
    await prisma.newsletter.createMany({
      skipDuplicates: true,
      data: raw.Newsletter.map((row) => ({
        id: row.id,
        title: row.title,
        summaryWeb: row.summaryWeb,
        summaryWpp: row.summaryWpp,
        summaryPush: row.summaryPush,
        date: toDate(row.date, 'Newsletter.date'),
      })),
    });
  }

  if (raw.Tweet.length > 0) {
    await prisma.tweet.createMany({
      skipDuplicates: true,
      data: raw.Tweet.map((row) => ({
        id: row.id,
        originalId: row.originalId,
        author: row.author,
        text: row.text,
        likes: Number(row.likes ?? 0),
        retweets: Number(row.retweets ?? 0),
        url: row.url,
        createdAt: toDate(row.createdAt, 'Tweet.createdAt'),
        newsletterId: row.newsletterId ?? null,
      })),
    });
  }

  // 4. Inscrições push
  if (raw.PushSubscription.length > 0) {
    await prisma.pushSubscription.createMany({
      skipDuplicates: true,
      data: raw.PushSubscription.map((row) => ({
        id: row.id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        createdAt: toDate(row.createdAt, 'PushSubscription.createdAt'),
      })),
    });
  }

  const destino = {
    Settings: await prisma.settings.count(),
    Newsletter: await prisma.newsletter.count(),
    Tweet: await prisma.tweet.count(),
    PushSubscription: await prisma.pushSubscription.count(),
  };
  console.log('Destino (Neon):', JSON.stringify(destino));

  const latest = await prisma.newsletter.findFirst({ orderBy: date => ({ date: 'desc' }) }).catch(() => null);
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
  console.log(
    'Verificação:',
    JSON.stringify({
      scheduleTime: settings?.scheduleTime,
      autoSchedule: settings?.autoSchedule,
      telegramPresente: Boolean(settings?.telegramToken),
      chatId: settings?.telegramChatId,
      ultimaEdicao: latest ? latest.date.toISOString() : null,
    })
  );

  const falhou = Object.entries(destino).some(([table, count]) => count !== raw[table].length);
  if (falhou) {
    throw new Error('Contagens divergentes entre origem e destino!');
  }
  console.log('✅ Migração concluída com contagens idênticas.');
}

main()
  .catch((e) => {
    console.error('❌ FALHA NA MIGRAÇÃO:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
