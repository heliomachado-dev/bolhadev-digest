import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Inscrição inválida' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true, message: 'Push subscription salva com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao salvar push subscription:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
