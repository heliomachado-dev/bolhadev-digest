import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEffectiveSettings } from '@/lib/settings';

// Retorna as configurações efetivas (banco + fallback de env vars na Vercel)
export async function GET() {
  try {
    const settings = await getEffectiveSettings();
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

// Salva as configurações no banco local
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { whatsappNumber, whatsappWebhook, telegramChatId, telegramToken, autoSchedule, scheduleTime } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        whatsappNumber: whatsappNumber || '',
        whatsappWebhook: whatsappWebhook || '',
        telegramChatId: telegramChatId || '',
        telegramToken: telegramToken || '',
        autoSchedule: Boolean(autoSchedule),
        scheduleTime: scheduleTime || '07:00',
      },
      create: {
        id: 'default',
        whatsappNumber: whatsappNumber || '',
        whatsappWebhook: whatsappWebhook || '',
        telegramChatId: telegramChatId || '',
        telegramToken: telegramToken || '',
        autoSchedule: Boolean(autoSchedule),
        scheduleTime: scheduleTime || '07:00',
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
