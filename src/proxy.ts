import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Autenticação do painel administrativo (HTTP Basic Auth).
 *
 * Protege /settings e as APIs administrativas (configurações, teste de envio e
 * geração manual de edição) — o bot token e o chat ID só saem para quem loga.
 * O GET do cron (Vercel) passa livre: a própria rota valida o CRON_SECRET.
 * Fail-closed: sem ADMIN_USERNAME/ADMIN_PASSWORD configuradas → 503.
 */

const REALM = 'BolhaDev Digest';

function checkBasicAuth(header: string | null): 'ok' | 'missing' | 'invalid' {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return 'missing';
  if (!header || !header.startsWith('Basic ')) return 'invalid';

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return 'invalid';
  }

  const sep = decoded.indexOf(':');
  if (sep < 0) return 'invalid';

  const u = decoded.slice(0, sep);
  const p = decoded.slice(sep + 1);
  return u === user && p === pass ? 'ok' : 'invalid';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron oficial da Vercel chega em GET — validado dentro da rota via CRON_SECRET
  if (pathname.startsWith('/api/cron') && request.method === 'GET') {
    return NextResponse.next();
  }

  const needsAuth =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/api/settings' ||
    pathname.startsWith('/api/settings/') ||
    pathname.startsWith('/api/cron');

  if (!needsAuth) return NextResponse.next();

  const result = checkBasicAuth(request.headers.get('authorization'));
  if (result === 'ok') return NextResponse.next();

  if (result === 'missing') {
    return new NextResponse(
      'Admin não configurado: defina ADMIN_USERNAME e ADMIN_PASSWORD nas variáveis de ambiente e faça novo deploy.',
      { status: 503 }
    );
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export const config = {
  matcher: ['/settings', '/settings/:path*', '/api/settings', '/api/settings/:path*', '/api/cron/:path*'],
};
