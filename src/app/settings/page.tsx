import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '@/components/LoginForm';
import LogoutButton from '@/components/LogoutButton';
import SettingsPanel from '@/components/SettingsPanel';
import { SESSION_COOKIE, adminConfigured, verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Sem sessão válida a página mostra o login; com sessão, o painel de ajustes.
// O conteúdo sensível em si continua vindo de /api/settings (protegida no proxy).
export default async function SettingsPage() {
  const store = await cookies();
  const authenticated = adminConfigured() && (await verifySession(store.get(SESSION_COOKIE)?.value));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <h1 className="text-lg font-bold text-white">
            {authenticated ? 'Configurações & Canais' : 'Acesso do Administrador'}
          </h1>
          {authenticated ? <LogoutButton /> : <div className="w-16" />}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {authenticated ? <SettingsPanel /> : <LoginForm />}
      </main>
    </div>
  );
}
