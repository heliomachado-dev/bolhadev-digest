import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/notifier';

// POST: botão "Enviar teste" nas configurações — verifica o Telegram sem gerar edição
export async function POST() {
  try {
    const result = await sendTelegramMessage(
      '🧪 *Teste de conexão*\n\nSe você recebeu esta mensagem, o Telegram do BolhaDev Digest está configurado corretamente!'
    );

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: result.fallback
          ? 'Mensagem entregue (sem formatação — o Markdown original estava inválido).'
          : 'Mensagem de teste enviada com sucesso! Confira seu Telegram.',
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Falha desconhecida ao enviar' },
      { status: 502 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao testar Telegram';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
