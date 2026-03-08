import type { APIRoute } from 'astro';
import { createMagicLinkToken } from '../../../lib/auth';
import { sendMagicLink } from '../../../lib/email';
import { getDb } from '../../../lib/db';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const email = body?.email?.trim()?.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const token = createMagicLinkToken(email);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const db = getDb();
    await db.execute({
      sql: 'INSERT INTO magic_links (email, token_hash, expires_at) VALUES (?, ?, ?)',
      args: [email, tokenHash, expiresAt],
    });
    await sendMagicLink(email, token, url.origin);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('magic-link error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
