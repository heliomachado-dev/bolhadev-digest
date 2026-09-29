import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

// Sem isso o handler vira estático no build e o POST responde 405
export const dynamic = 'force-dynamic';

// POST: encerra a sessão do admin (apaga o cookie)
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
