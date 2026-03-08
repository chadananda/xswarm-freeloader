import type { AstroCookies } from 'astro';
import jwt from 'jsonwebtoken';
import { getDb } from './db';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'dev-secret-change-in-prod';
const COOKIE_NAME = 'fl_auth';

export interface User {
  id: number;
  email: string;
  created_at: string;
  last_login: string;
}

export function createSessionToken(userId: number, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifySessionToken(token: string): { sub: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: number; email: string };
  } catch {
    return null;
  }
}

export function createMagicLinkToken(email: string): string {
  return jwt.sign({ email, type: 'magic' }, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyMagicLinkToken(token: string): { email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { email: string; type: string };
    if (payload.type !== 'magic') return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function getUser(cookies: AstroCookies): Promise<User | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [payload.sub] });
  return result.rows[0] as unknown as User ?? null;
}

export function setAuthCookie(cookies: AstroCookies, token: string) {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export function clearAuthCookie(cookies: AstroCookies) {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function requireAuth(cookies: AstroCookies): Promise<User> {
  const user = await getUser(cookies);
  if (!user) throw new Response(null, { status: 302, headers: { Location: '/?login=1' } });
  return user;
}
