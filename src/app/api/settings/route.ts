import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    return NextResponse.json({
      success: true,
      settings: settings || {
        whatsappNumber: '',
        telegramChatId: '',
        telegramToken: '',
        autoSchedule: false,
        scheduleTime: '07:00'
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { whatsappNumber, telegramChatId, telegramToken, autoSchedule, scheduleTime } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        whatsappNumber: whatsappNumber || '',
        telegramChatId: telegramChatId || '',
        telegramToken: telegramToken || '',
        autoSchedule: Boolean(autoSchedule),
        scheduleTime: scheduleTime || '07:00'
      },
      create: {
        id: 'default',
        whatsappNumber: whatsappNumber || '',
        telegramChatId: telegramChatId || '',
        telegramToken: telegramToken || '',
        autoSchedule: Boolean(autoSchedule),
        scheduleTime: scheduleTime || '07:00'
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
