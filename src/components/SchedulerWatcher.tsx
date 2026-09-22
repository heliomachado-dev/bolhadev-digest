'use client';

import { useEffect } from 'react';

export default function SchedulerWatcher() {
  useEffect(() => {
    // Verifica a cada 60 segundos se o agendamento automático está ativado e se chegou o horário programado
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings && data.settings.autoSchedule && data.settings.whatsappNumber) {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          if (currentTime === data.settings.scheduleTime) {
            // Evita disparar multiplas vezes no mesmo minuto
            const lastTrigger = localStorage.getItem('last_auto_trigger');
            const todayStr = now.toDateString();
            if (lastTrigger !== `${todayStr}-${currentTime}`) {
              localStorage.setItem('last_auto_trigger', `${todayStr}-${currentTime}`);
              console.log('Horário programado atingido! Disparando newsletter automática...');
              await fetch('/api/cron/generate');
            }
          }
        }
      } catch (err) {
        console.error('Erro no verificado de agendamento automático:', err);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
