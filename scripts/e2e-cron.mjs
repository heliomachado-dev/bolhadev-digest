// Teste E2E do fluxo automático do cron (roda com: node --env-file=.env scripts/e2e-cron.mjs)
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const secret = process.env.CRON_SECRET;
const base = 'http://localhost:3000';

function fmt(label, j) {
  if (j.skipped) return `${label}: SKIP - ${j.reason}`;
  const t = j.results?.telegram;
  return `${label}: success=${j.success} newsletter=${j.newsletterId} telegram.ok=${t?.ok}${t?.error ? ' erro=' + t.error : ''}`;
}

try {
  const before = await p.settings.findUnique({ where: { id: 'default' } });
  console.log('ANTES:', JSON.stringify({ scheduleTime: before.scheduleTime, lastAutoSentDate: before.lastAutoSentDate }));

  // Prepara: horário = hora atual (BRT) e marcador limpo
  const hour = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  await p.settings.update({
    where: { id: 'default' },
    data: { scheduleTime: `${hour}:00`, lastAutoSentDate: '' },
  });
  console.log(`SETUP: scheduleTime=${hour}:00 (hora atual), lastAutoSentDate limpo`);

  const headers = { Authorization: `Bearer ${secret}` };

  // 1º disparo: deve gerar + enviar
  const r1 = await fetch(`${base}/api/cron/generate`, { headers });
  const j1 = await r1.json();
  globalThis.__createdNewsletterId = j1.newsletterId || null;
  console.log(fmt('DISPARO 1 (esperado: envio real)', j1));

  // 2º disparo: deve pular por dedupe
  const r2 = await fetch(`${base}/api/cron/generate`, { headers });
  console.log(fmt('DISPARO 2 (esperado: SKIP dedupe)', await r2.json()));

  // 3º sem token errado: deve dar 401
  const r3 = await fetch(`${base}/api/cron/generate`, { headers: { Authorization: 'Bearer errado' } });
  console.log(`DISPARO 3 (esperado: 401): status=${r3.status}`);

  // Restaura o horário e o estado de dedupe originais (limpeza automática)
  await p.settings.update({
    where: { id: 'default' },
    data: {
      scheduleTime: before.scheduleTime || '09:17',
      lastAutoSentDate: before.lastAutoSentDate || '',
    },
  });

  // Remove a newsletter de teste criada neste script
  const createdId = globalThis.__createdNewsletterId;
  if (createdId) {
    try {
      await p.newsletter.delete({ where: { id: createdId } });
      console.log('LIMPEZA: newsletter de teste removida:', createdId);
    } catch {
      console.log('LIMPEZA: newsletter de teste já removida');
    }
  }

  const after = await p.settings.findUnique({ where: { id: 'default' } });
  console.log('DEPOIS (restaurado):', JSON.stringify({ scheduleTime: after.scheduleTime, autoSchedule: after.autoSchedule, lastAutoSentDate: after.lastAutoSentDate }));
} catch (e) {
  console.error('FALHA NO TESTE:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
