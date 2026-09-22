'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, MessageSquare, Save, CheckCircle2, Shield, Clock, Send, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [whatsappWebhook, setWhatsappWebhook] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setWhatsappWebhook(data.settings.whatsappWebhook || '');
          setTelegramChatId(data.settings.telegramChatId || '');
          setTelegramToken(data.settings.telegramToken || '');
          setAutoSchedule(data.settings.autoSchedule || false);
          setScheduleTime(data.settings.scheduleTime || '07:00');
        }
      })
      .catch((err) => console.error(err));

    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappWebhook,
          telegramChatId,
          telegramToken,
          autoSchedule,
          scheduleTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Seu navegador não suporta Web Push Notifications.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permissão para notificações negada.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        alert('Chave VAPID pública não configurada.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if ((await res.json()).success) {
        setPushEnabled(true);
        alert('Web Push ativado com sucesso!');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao ativar notificações.');
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <h1 className="text-lg font-bold text-white">Configurações & Canais</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        <form onSubmit={handleSave} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Agendamento Diário
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
              />
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={autoSchedule} onChange={(e) => setAutoSchedule(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm">Ativar envio automático</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-400" /> Telegram Bot
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Chat ID" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100" />
              <input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="Bot Token" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100" />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> WhatsApp (via Webhook)
            </h2>
            <input type="text" value={whatsappWebhook} onChange={(e) => setWhatsappWebhook(e.target.value)} placeholder="URL do Webhook (Opcional)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100" />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition shadow-lg">
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </main>
    </div>
  );
}
