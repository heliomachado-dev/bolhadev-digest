import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, adminConfigured, verifySession } from '@/lib/auth';

// GET: informa se há uma sessão de admin válida (usado pela UI)
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json(
      { success: false, authenticated: false, configured: false },
      { status: 503 }
    );
  }

  const store = await cookies();
  const authenticated = await verifySession(store.get(SESSION_COOKIE)?.value);

  return NextResponse.json({ success: true, authenticated, configured: true });
}
