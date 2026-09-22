import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchTechNewsAndTweets, summarizeTweets } from '@/lib/ai';
import { sendTelegramMessage, sendPushNotifications, sendWhatsAppWebhookMessage } from '@/lib/notifier';

export async function GET(request: Request) {
  try {
    // 1. Coletar dados
    const tweets = await fetchTechNewsAndTweets();
    const aiResult = await summarizeTweets(tweets);

    // 2. Salvar histórico
    const newsletter = await prisma.newsletter.create({
      data: {
        title: `BolhaDev Digest - ${new Date().toLocaleDateString('pt-BR')}`,
        summaryWeb: aiResult.summaryWeb,
        summaryWpp: aiResult.summaryWpp,
        summaryPush: aiResult.summaryPush,
      },
    });

    // 3. Disparo Automático (Multicanal)
    // Telegram (Via API Oficial - Robusto)
    await sendTelegramMessage(aiResult.summaryWpp);

    // Web Push (Nativo do navegador)
    await sendPushNotifications('BolhaDev Digest 🚀', aiResult.summaryPush);

    // WhatsApp Opcional (Gateway Webhook)
    await sendWhatsAppWebhookMessage(aiResult.summaryWpp);

    return NextResponse.json({
      success: true,
      message: 'Edição gerada e disparada para os canais ativados!',
    });
  } catch (error: any) {
    console.error('Erro na automação:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
