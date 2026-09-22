'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cron/generate');
      const data = await res.json();
      if (data.success) {
        alert('Newsletter gerada e disparada com sucesso!');
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
