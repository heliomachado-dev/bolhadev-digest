import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, adminConfigured, verifySession } from '@/lib/auth';

/**
 * Proteção das rotas administrativas (cookie de sessão do login do painel).
 *
 * O login acontece em `/settings` (formulário próprio, sem Basic Auth do
 * navegador) e emite um cookie httpOnly assinado — este proxy exige esse
 * cookie nas APIs admin, então o bot token e o chat ID só saem para quem
 * logou, e ninguém dispara edição sem sessão.
 *
 * - `GET /api/cron/*` (Vercel Cron) passa livre: a rota valida o CRON_SECRET.
 * - `GET /settings` também passa livre: a página lê o cookie no servidor e
 *   mostra o formulário de login quando não há sessão (o dado sensível só
 *   vem de `/api/settings`, que continua protegida).
 * - Fail-closed: sem ADMIN_USERNAME/ADMIN_PASSWORD configuradas → 503.
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas de login/sessão cuidam da própria autenticação
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Cron oficial da Vercel chega em GET — validado dentro da rota via CRON_SECRET
  if (pathname.startsWith('/api/cron') && request.method === 'GET') {
    return NextResponse.next();
  }

  const needsAuth =
    pathname === '/api/settings' ||
    pathname.startsWith('/api/settings/') ||
    pathname.startsWith('/api/cron');

  if (!needsAuth) return NextResponse.next();

  if (!adminConfigured()) {
    return new NextResponse(
      'Admin não configurado: defina ADMIN_USERNAME e ADMIN_PASSWORD nas variáveis de ambiente e faça novo deploy.',
      { status: 503 }
    );
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  return NextResponse.json(
    { success: false, error: 'Sessão expirada ou inexistente. Faça login novamente.' },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/settings', '/api/settings/:path*', '/api/cron/:path*'],
};
