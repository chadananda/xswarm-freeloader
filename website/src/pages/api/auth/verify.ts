import type { APIRoute } from 'astro';
import { verifyMagicLinkToken, createSessionToken, setAuthCookie } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import { enrollUser } from '../../../lib/sequences';
import crypto from 'crypto';

export const GET: APIRoute = async ({ url, cookies }) => {
  const token = url.searchParams.get('token');
  if (!token) return new Response(null, { status: 302, headers: { Location: '/?error=invalid' } });
  const payload = verifyMagicLinkToken(token);
  if (!payload) return new Response(null, { status: 302, headers: { Location: '/?error=expired' } });
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const db = getDb();
    const linkResult = await db.execute({
      sql: "SELECT * FROM magic_links WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')",
      args: [tokenHash],
    });
    if (!linkResult.rows.length) return new Response(null, { status: 302, headers: { Location: '/?error=expired' } });
    await db.execute({ sql: "UPDATE magic_links SET used_at = datetime('now') WHERE token_hash = ?", args: [tokenHash] });
    let userResult = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [payload.email] });
    let userId: number;
    const isNewUser = !userResult.rows.length;
    if (isNewUser) {
      const inserted = await db.execute({ sql: "INSERT INTO users (email) VALUES (?)", args: [payload.email] });
      userId = Number(inserted.lastInsertRowid);
    } else {
      userId = Number(userResult.rows[0].id);
      await db.execute({ sql: "UPDATE users SET last_login = datetime('now') WHERE id = ?", args: [userId] });
    }
    const sessionToken = createSessionToken(userId, payload.email);
    setAuthCookie(cookies, sessionToken);
    if (isNewUser) await enrollUser(userId, payload.email, 'onboarding');
    return new Response(null, { status: 302, headers: { Location: '/docs' } });
  } catch (err) {
    console.error('verify error:', err);
    return new Response(null, { status: 302, headers: { Location: '/?error=server' } });
  }
};
