'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Converte a chave VAPID de URL-safe base64 para Uint8Array (exigência da Push API)
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

type State = 'idle' | 'loading' | 'active';

/**
 * Botão público de inscrição em Web Push: qualquer visitante pode ativar a
 * notificação diária no navegador (permissão + subscription salva via API).
 * Renderiza nada apenas se o VAPID não estiver configurado; em navegadores
 * sem Push API o clique explica o motivo.
 */
export default function PushSubscribeButton() {
  const [state, setState] = useState<State>('idle');
  const supported =
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator)) return;
    let active = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (active && sub) setState('active');
      })
      .catch(() => {
        /* SW indisponível — mantém botão ocioso */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!VAPID_PUBLIC_KEY) return null;

  const handleSubscribe = async () => {
    try {
      if (!supported) {
        alert('Este navegador não suporta notificações. Use Chrome, Edge, Firefox ou Safari recente.');
        return;
      }
      setState('loading');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('idle');
        alert('Permissão negada. Libere as notificações nas configurações do navegador para ativar.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh') as ArrayBuffer),
            auth: arrayBufferToBase64(subscription.getKey('auth') as ArrayBuffer),
          },
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar a inscrição push');

      setState('active');
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      setState('idle');
      alert('Não foi possível ativar as notificações neste navegador.');
    }
  };

  const baseClass =
    'p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-70 text-slate-200 rounded-xl transition flex items-center gap-2 text-sm font-medium border border-slate-700';

  if (state === 'active') {
    return (
      <button
        type="button"
        disabled
        title="Você receberá a edição do dia como notificação neste navegador"
        className={`${baseClass} cursor-default`}
      >
        <BellRing className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline text-emerald-400">Notificações ativas</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={state === 'loading'}
      title="Receber a edição do dia como notificação no navegador"
      className={baseClass}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{state === 'loading' ? 'Ativando...' : 'Receber aviso'}</span>
    </button>
  );
}
