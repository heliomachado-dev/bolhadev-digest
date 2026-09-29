/**
 * Autenticação do painel administrativo (login próprio, sem Basic Auth).
 *
 * - Usuário/senha validados contra ADMIN_USERNAME / ADMIN_PASSWORD.
 * - Sessão = cookie httpOnly assinado com HMAC-SHA256 (payload = expiração),
 *   usando Web Crypto (`crypto.subtle`), que existe tanto no runtime Node
 *   quanto no Edge do proxy do Next 16 — sem dependências externas.
 * - A chave do HMAC é derivada das credenciais do admin: mudou a senha,
 *   as sessões antigas deixam de valer.
 * - Fail-closed: sem ADMIN_* configuradas não existe sessão válida.
 */

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const encoder = new TextEncoder();

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function getSecret(): string | null {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return null;
  return `admin:${user}:${pass}`;
}

/** Comparação em tempo constante — não revela em que posição o valor divergiu. */
export function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Gera o token de sessão: `<expira-em-ms>.<assinatura-hmac>`. */
export async function signSession(now: number = Date.now()): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const exp = String(now + SESSION_TTL_MS);
  const sig = await hmacHex(exp, secret);
  return `${exp}.${sig}`;
}

/** Valida assinatura e prazo de validade do token de sessão. */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const expected = await hmacHex(payload, secret);
  if (!safeEqual(token.slice(dot + 1), expected)) return false;

  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Valida as credenciais enviadas no formulário de login. */
export function verifyCredentials(username: string, password: string): boolean {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false;
  return safeEqual(username, user) && safeEqual(password, pass);
}

/** Opções padrão do cookie de sessão (httpOnly, SameSite, 7 dias). */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};
