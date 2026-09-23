import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectiveSettings } from '@/lib/settings';
import { fetchTechNewsAndTweets, summarizeTweets } from '@/lib/ai';
import { sendTelegramMessage, sendPushNotifications, sendWhatsAppWebhookMessage } from '@/lib/notifier';

export const dynamic = 'force-dynamic';

type Trigger = 'cron' | 'watcher' | 'manual';

// Data e hora atuais no fuso do usuário (Brasil, America/Sao_Paulo)
function nowBRT(): { dateKey: string; hour: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour: get('hour'),
  };
}

async function generateAndDispatch(trigger: Trigger) {
  const settings = await getEffectiveSettings();
  const { dateKey, hour } = nowBRT();

  // Fluxos automáticos respeitam autoSchedule, o horário programado e a dedupe diária
  if (trigger !== 'manual') {
    if (!settings.autoSchedule) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Agendamento automático desativado',
      });
    }

    const scheduleHour = settings.scheduleTime.split(':')[0].padStart(2, '0');
    if (trigger === 'cron' && hour !== scheduleHour) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Fora do horário programado (${settings.scheduleTime})`,
      });
    }

    if (settings.lastAutoSentDate === dateKey) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Edição de hoje já foi enviada',
      });
    }
  }

  // Coletar dados e gerar edição
  const tweets = await fetchTechNewsAndTweets();
  const aiResult = await summarizeTweets(tweets);

  // Persistência é best-effort: falha de banco (ex.: FS read-only na Vercel)
  // não pode impedir o disparo dos canais
  let newsletterId: string | null = null;
  try {
    const newsletter = await prisma.newsletter.create({
      data: {
        title: `BolhaDev Digest - ${new Date().toLocaleDateString('pt-BR')}`,
        summaryWeb: aiResult.summaryWeb,
        summaryWpp: aiResult.summaryWpp,
        summaryPush: aiResult.summaryPush,
      },
    });
    newsletterId = newsletter.id;
  } catch (e) {
    console.warn(
      'Não foi possível salvar a edição no banco (seguindo para o disparo):',
      e instanceof Error ? e.message : e
    );
  }

  // Disparo multicanal com resultado real por canal (nada de "sucesso" falso)
  const results = {
    telegram: await sendTelegramMessage(aiResult.summaryWpp),
    push: await sendPushNotifications('BolhaDev Digest 🚀', aiResult.summaryPush),
    whatsapp: await sendWhatsAppWebhookMessage(aiResult.summaryWpp),
  };

  const telegramOk = results.telegram.ok === true;
  const anyOk = Object.values(results).some((r) => r.ok === true);

  // Dedupe diária: automático sempre marca; manual só marca se o Telegram saiu
  // (para o cron não repetir a edição que o usuário acabou de receber)
  if (trigger !== 'manual' || telegramOk) {
    try {
      await prisma.settings.upsert({
        where: { id: 'default' },
        update: { lastAutoSentDate: dateKey },
        create: { id: 'default', lastAutoSentDate: dateKey },
      });
    } catch (e) {
      console.warn(
        'Não foi possível registrar a dedupe diária:',
        e instanceof Error ? e.message : e
      );
    }
  }

  return NextResponse.json({
    success: anyOk,
    newsletterId,
    trigger,
    results,
  });
}

// GET: chamado pelos crons da Vercel (protegido por CRON_SECRET)
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization');

    if (secret) {
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
      }
    } else if (process.env.VERCEL) {
      // Em produção o CRON_SECRET é obrigatório para não deixar a rota aberta
      console.warn('CRON_SECRET não configurado na Vercel — recusando chamada de cron.');
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET não configurado' },
        { status: 500 }
      );
    }

    return await generateAndDispatch('cron');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro na automação (cron):', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: botão manual da UI ou SchedulerWatcher local
export async function POST(request: Request) {
  try {
    let mode: Trigger = 'manual';
    try {
      const body = await request.json();
      if (body?.mode === 'auto') mode = 'watcher';
    } catch {
      // sem body = botão manual
    }
    return await generateAndDispatch(mode);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro na automação (POST):', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
