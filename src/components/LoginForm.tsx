'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Loader2, ShieldAlert } from 'lucide-react';

// Tela de login do admin exibida em /settings quando não há sessão válida
export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Informe usuário e senha.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}) as { success?: boolean; error?: string });

      if (res.ok && data.success) {
        // Cookie gravado: reavalia a server component e mostra o painel
        router.refresh();
        return;
      }
      setError(data.error || 'Usuário ou senha incorretos.');
    } catch (err) {
      console.error(err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl"
      >
        <div className="space-y-2 text-center">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Login do administrador</h2>
          <p className="text-xs text-slate-400">
            Este painel é restrito. Entre com as credenciais do admin para ver e editar as configurações.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Voltar para a home
          </Link>
          <span className="text-slate-500">Sessão válida por 7 dias</span>
        </div>
      </form>
    </div>
  );
}
