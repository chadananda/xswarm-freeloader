import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { sendEmail } from '../../../lib/email';
import { sequences } from '../../../lib/sequences';

// Cloudflare Cron Trigger — configure in wrangler.toml
// schedule: "0 9 * * *" (daily at 9am UTC)
export const GET: APIRoute = async ({ request }) => {
  // Protect with a shared secret to prevent public invocation
  const authHeader = request.headers.get('x-cron-secret');
  if (authHeader !== import.meta.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const db = getDb();
  const results: string[] = [];
  for (const [seqName, sequence] of Object.entries(sequences)) {
    for (const step of sequence.steps) {
      if (step.day === 0) continue; // day 0 sent at signup
      // Find users enrolled in this sequence who haven't received this step yet
      // and whose signup date is >= step.day days ago
      const pending = await db.execute({
        sql: `
          SELECT u.id, u.email
          FROM users u
          JOIN email_sequences es ON es.user_id = u.id
          WHERE es.sequence_name = ?
            AND es.step = 0
            AND NOT EXISTS (
              SELECT 1 FROM email_sequences es2
              WHERE es2.user_id = u.id
                AND es2.sequence_name = ?
                AND es2.step = ?
            )
            AND datetime(u.created_at, '+' || ? || ' days') <= datetime('now')
        `,
        args: [seqName, seqName, step.day, step.day],
      });
      for (const row of pending.rows) {
        const userId = Number(row.id);
        const email = String(row.email);
        try {
          await sendEmail(email, step.subject, step.html);
          await db.execute({
            sql: "INSERT INTO email_sequences (user_id, sequence_name, step, sent_at) VALUES (?, ?, ?, datetime('now'))",
            args: [userId, seqName, step.day],
          });
          results.push(`sent:${seqName}[${step.day}] → ${email}`);
        } catch (err) {
          results.push(`failed:${seqName}[${step.day}] → ${email}: ${err}`);
        }
      }
    }
  }
  return new Response(JSON.stringify({ ok: true, processed: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
