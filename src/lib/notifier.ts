import webpush from 'web-push';
import { prisma } from './prisma';
import { getEffectiveSettings } from './settings';
import axios from 'axios';

export type ChannelResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  fallback?: string;
  detail?: unknown;
};

type TelegramError = {
  response?: { status?: number; data?: { description?: string } };
};

// Extrai mensagem legível de erros desconhecidos (axios, Telegram, Node...)
function describeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const desc = (error as TelegramError).response?.data?.description;
    if (desc) return desc;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

// Configuração opcional de Web Push VAPID
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:contato@bolhadevdigest.local',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.error('Erro ao configurar VAPID:', e);
  }
}

// Canal 1: Telegram Bot (Oficial, estável e instantâneo via HTTP)
export async function sendTelegramMessage(message: string): Promise<ChannelResult> {
  try {
    const settings = await getEffectiveSettings();
    const botToken = settings.telegramToken;
    const chatId = settings.telegramChatId;

    if (!botToken || !chatId) {
      console.log('Telegram não configurado (Chat ID ou Bot Token ausentes).');
      return { ok: false, skipped: true, error: 'Telegram não configurado (Chat ID ou Bot Token ausentes)' };
    }

    const formattedMessage =
      '🚀 *BOLHADEV DIGEST & TECH NEWS*\n' +
      '📅 *Data:* ' + new Date().toLocaleDateString('pt-BR') + '\n\n' +
      message + '\n\n' +
      '🌐 _Acesse o BolhaDev Digest PWA para ver os destaques completos._';

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'Markdown',
      });
      console.log('✅ Mensagem enviada com sucesso no Telegram!');
      return { ok: true, detail: response.data };
    } catch (firstError: unknown) {
      const status = (firstError as TelegramError).response?.status;
      const desc = describeError(firstError);

      // Fallback: se o Markdown gerado não puder ser parseado, reenvia sem formatação
      const isMarkdownError =
        status === 400 && /can't parse entities|can't find end of the entity|unsupported start tag/i.test(desc);

      if (isMarkdownError) {
        console.warn('Markdown inválido no resumo do Telegram. Reenviando sem parse_mode...', desc);
        try {
          const response = await axios.post(url, {
            chat_id: chatId,
            text: formattedMessage,
          });
          console.log('✅ Mensagem enviada sem Markdown (fallback) no Telegram!');
          return { ok: true, fallback: 'plain-text', detail: response.data };
        } catch (retryError: unknown) {
          const retryDesc = describeError(retryError);
          console.error('Erro ao enviar mensagem no Telegram (fallback):', retryDesc);
          return { ok: false, error: retryDesc };
        }
      }

      console.error('Erro ao enviar mensagem no Telegram:', desc);
      return { ok: false, error: desc };
    }
  } catch (error: unknown) {
    const errorMsg = describeError(error);
    console.error('Erro ao enviar mensagem no Telegram:', errorMsg);
    return { ok: false, error: errorMsg };
  }
}

// Canal 2: Web Push Notifications (Nativo do Navegador)
export async function sendPushNotifications(title: string, body: string): Promise<ChannelResult> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany();
    if (subscriptions.length === 0) {
      return { ok: false, skipped: true, error: 'Nenhuma inscrição push registrada' };
    }

    const payload = JSON.stringify({ title, body, icon: '/favicon.ico' });
    let sent = 0;
    let failed = 0;
    let lastError = '';

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent += 1;
      } catch (error: unknown) {
        failed += 1;
        lastError = describeError(error);
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }

    if (sent > 0) {
      return { ok: true, detail: { sent, failed } };
    }
    return { ok: false, error: lastError || 'Falha ao enviar push notifications' };
  } catch (error: unknown) {
    // Banco indisponível (ex.: FS read-only na Vercel) não derruba os demais canais
    const desc = describeError(error);
    console.warn('Push notifications indisponíveis:', desc);
    return { ok: false, skipped: true, error: `Push indisponível: ${desc}` };
  }
}

// Canal Opcional: Gateway WhatsApp via Webhook HTTP
export async function sendWhatsAppWebhookMessage(message: string): Promise<ChannelResult> {
  let webhookUrl = '';
  try {
    const settings = await getEffectiveSettings();
    webhookUrl = settings.whatsappWebhook;
  } catch {
    webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';
  }

  if (!webhookUrl) {
    return { ok: false, skipped: true, error: 'Webhook do WhatsApp não configurado (opcional)' };
  }

  try {
    const response = await axios.post(webhookUrl, { message });
    return { ok: true, detail: response.data };
  } catch (error: unknown) {
    return { ok: false, error: describeError(error) };
  }
}
