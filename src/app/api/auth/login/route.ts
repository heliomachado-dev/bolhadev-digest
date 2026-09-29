import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  adminConfigured,
  sessionCookieOptions,
  signSession,
  verifyCredentials,
} from '@/lib/auth';

// POST: formulário de login do painel — valida usuário/senha e emite o cookie de sessão
export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Admin não configurado: defina ADMIN_USERNAME e ADMIN_PASSWORD nas variáveis de ambiente e faça novo deploy.',
      },
      { status: 503 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Requisição inválida.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!verifyCredentials(username, password)) {
    // Pequena pausa para dificultar tentativas automatizadas de força bruta
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json(
      { success: false, error: 'Usuário ou senha incorretos.' },
      { status: 401 }
    );
  }

  const token = await signSession();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Erro ao criar sessão.' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
