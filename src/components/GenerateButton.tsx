'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function describeResults(results: Record<string, { ok?: boolean; skipped?: boolean; error?: string }> | undefined) {
  if (!results) return '';
  const labels: Record<string, string> = {
    telegram: 'Telegram',
    push: 'Push',
    whatsapp: 'WhatsApp',
  };
  return Object.entries(results)
    .map(([key, res]) => {
      const label = labels[key] || key;
      if (res.ok) return `${label}: ✅ enviado`;
      if (res.skipped) return `${label}: ⏭️ ${res.error || 'não configurado'}`;
      return `${label}: ❌ ${res.error || 'falhou'}`;
    })
    .join('\n');
}

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cron/generate', { method: 'POST' });
      if (res.status === 401 || res.status === 503) {
        alert('Acesso restrito 🔒\n\nA geração manual é do administrador. Faça login em Configurações (usuário e senha do admin) e tente novamente.');
        router.push('/settings');
        return;
      }
      const data = await res.json();
      if (data.success) {
        const details = describeResults(data.results);
        alert(
          'Newsletter gerada!\n\n' +
            (details || 'Sem detalhes de envio.') +
            (details && !data.results?.telegram?.ok
              ? '\n\n⚠️ O Telegram não recebeu a mensagem. Confira os detalhes acima.'
              : '')
        );
        router.refresh();
      } else {
        alert('Erro ao gerar: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao gerar newsletter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-indigo-600/25"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      <span>{loading ? 'Gerando...' : 'Gerar Edição Agora'}</span>
    </button>
  );
}
