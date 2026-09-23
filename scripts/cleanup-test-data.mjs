// Limpeza pós-teste: restaura scheduleTime original e remove newsletters de teste
// Roda com: node --env-file=.env scripts/cleanup-test-data.mjs
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const TEST_NEWSLETTER_IDS = [
  'cmue4gsjp0000uwjcekk5jp0r', // teste manual ~10:11
  'cmue4wote0001uwjcypat2y8j', // teste e2e ~10:23
];

try {
  const before = await p.settings.findUnique({ where: { id: 'default' } });
  console.log('ANTES:', JSON.stringify({ scheduleTime: before.scheduleTime }));

  const restored = await p.settings.update({
    where: { id: 'default' },
    data: { scheduleTime: '09:17' },
  });
  console.log('RESTAURADO scheduleTime:', restored.scheduleTime);

  let deleted = 0;
  for (const id of TEST_NEWSLETTER_IDS) {
    try {
      await p.newsletter.delete({ where: { id } });
      deleted += 1;
      console.log('removida newsletter de teste:', id);
    } catch {
      console.log('newsletter de teste não encontrada (ok):', id);
    }
  }

  const count = await p.newsletter.count();
  const latest = await p.newsletter.findFirst({ orderBy: { date: 'desc' } });
  console.log(`RESULTADO: ${deleted} removidas | ${count} newsletters restantes | última: ${latest?.date} (${latest?.title})`);
} catch (e) {
  console.error('FALHA:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
