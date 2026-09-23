import { prisma } from './prisma';

export type EffectiveSettings = {
  whatsappNumber: string;
  whatsappWebhook: string;
  telegramChatId: string;
  telegramToken: string;
  autoSchedule: boolean;
  scheduleTime: string;
  lastAutoSentDate: string;
};

// Lê as settings do banco com fallback para variáveis de ambiente.
//
// - Banco disponível (local SQLite ou Neon na Vercel): o banco é a fonte de
//   verdade — a UI de Configurações funciona e persiste normalmente.
// - Banco indisponível (FS read-only, DATABASE_URL ausente): as env vars
//   garantem que agendamento e Telegram continuem funcionando.
//
// Regras de precedência:
// - telegram*/whatsapp*/lastAutoSentDate: banco primeiro, env como fallback.
// - scheduleTime: banco primeiro, depois env, depois default.
// - autoSchedule: se a linha existe usa o banco; senão usa a env AUTO_SCHEDULE.
export async function getEffectiveSettings(): Promise<EffectiveSettings> {
  let db: Partial<EfficientSettingsRow> | null = null;

  try {
    db = await prisma.settings.findUnique({ where: { id: 'default' } });
  } catch (e) {
    console.warn(
      'Falha ao ler settings do banco; usando apenas env vars.',
      e instanceof Error ? e.message : e
    );
  }

  return {
    whatsappNumber: db?.whatsappNumber || '',
    whatsappWebhook: db?.whatsappWebhook || process.env.WHATSAPP_WEBHOOK_URL || '',
    telegramChatId: db?.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
    telegramToken: db?.telegramToken || process.env.TELEGRAM_BOT_TOKEN || '',
    autoSchedule: db ? Boolean(db.autoSchedule) : process.env.AUTO_SCHEDULE === 'true',
    scheduleTime: db?.scheduleTime || process.env.SCHEDULE_TIME || '07:00',
    lastAutoSentDate: db?.lastAutoSentDate || '',
  };
}

// Forma do registro Settings no banco (parcial pois pode falhar a leitura)
type EfficientSettingsRow = {
  whatsappNumber: string;
  whatsappWebhook: string;
  telegramChatId: string;
  telegramToken: string;
  autoSchedule: boolean;
  scheduleTime: string;
  lastAutoSentDate: string;
};
