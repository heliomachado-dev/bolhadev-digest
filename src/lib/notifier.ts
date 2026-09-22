// @ts-ignore
import webpush from 'web-push';
import { prisma } from './prisma';
import axios from 'axios';

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
export async function sendTelegramMessage(message: string) {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const botToken = settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings?.telegramChatId || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('Telegram não configurado (Chat ID ou Bot Token ausentes).');
      return { success: false, error: 'Telegram não configurado' };
    }

    const formattedMessage = 
      '🚀 *BOLHADEV DIGEST & TECH NEWS*\n' +
      '📅 *Data:* ' + new Date().toLocaleDateString('pt-BR') + '\n\n' +
      message + '\n\n' +
      '🌐 _Acesse o BolhaDev Digest PWA para ver os tweets em destaque._';

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: formattedMessage,
      parse_mode: 'Markdown',
    });

    console.log('✅ Mensagem enviada com sucesso no Telegram!');
    return { success: true, data: response.data };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.description || error.message;
    console.error('Erro ao enviar mensagem no Telegram:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Canal 2: Web Push Notifications (Nativo do Navegador)
export async function sendPushNotifications(title: string, body: string) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany();
    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({ title, body, icon: '/favicon.ico' });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Erro ao disparar push notifications:', err);
  }
}

// Canal Opcional: Gateway WhatsApp via Webhook HTTP
export async function sendWhatsAppWebhookMessage(message: string) {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, note: 'Webhook opcional não configurado.' };
  }

  try {
    const response = await axios.post(webhookUrl, { message });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
