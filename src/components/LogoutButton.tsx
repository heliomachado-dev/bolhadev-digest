'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

// Encerra a sessão do admin e volta para a home
export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title="Sair do painel"
      className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl transition flex items-center gap-2 text-sm font-medium border border-slate-700"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{loading ? 'Saindo...' : 'Sair'}</span>
    </button>
  );
}
