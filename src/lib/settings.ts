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
// - Local (SQLite): os valores salvos na UI prevalecem.
// - Vercel (filesystem read-only / banco efêmero): a leitura do banco pode
//   falhar ou vir desatualizada, então as env vars garantem que o agendamento
//   e o Telegram continuem funcionando.
//
// Regras de precedência:
// - telegram*/whatsapp*: banco primeiro, env como fallback.
// - scheduleTime: env primeiro (permite forçar o horário na Vercel sem gravar
//   no banco), depois banco, depois default.
// - autoSchedule: ativo se estiver true no banco OU na env AUTO_SCHEDULE.
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
    autoSchedule: Boolean(db?.autoSchedule) || process.env.AUTO_SCHEDULE === 'true',
    scheduleTime: process.env.SCHEDULE_TIME || db?.scheduleTime || '07:00',
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
