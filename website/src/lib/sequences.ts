import { sendEmail } from './email';
import { getDb } from './db';

export interface EmailSequence {
  name: string;
  steps: Array<{ day: number; subject: string; html: string }>;
}

const WELCOME_HTML = (email: string) => `
  <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:8px;max-width:520px">
    <h2 style="color:#a3e635;margin-top:0">Welcome to the free tier revolution</h2>
    <p>You're now part of a growing group of developers who refuse to pay for AI they can get for free.</p>
    <h3 style="color:#22c55e">Get started in 30 seconds:</h3>
    <pre style="background:#1e293b;padding:16px;border-radius:4px;color:#a3e635">npx xswarm-freeloader</pre>
    <p>That's it. Your OpenAI-compatible proxy is running on localhost:3000, routing to 100+ free tier models.</p>
    <p style="color:#64748b;font-size:13px">— The Freeloader team</p>
  </div>
`;

const DAY3_HTML = `
  <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:8px;max-width:520px">
    <h2 style="color:#a3e635;margin-top:0">3 tips to squeeze more free juice</h2>
    <ul style="line-height:2">
      <li><strong style="color:#22c55e">Use trust tiers</strong> — Route sensitive data only to open-source models</li>
      <li><strong style="color:#22c55e">Set budget controls</strong> — Hard cap at $0.00 to stay free forever</li>
      <li><strong style="color:#22c55e">Cache aggressively</strong> — Freeloader caches identical prompts automatically</li>
    </ul>
    <p>Check the <a href="https://freeloader.xswarm.ai/docs" style="color:#a3e635">docs</a> for the full config reference.</p>
  </div>
`;

const DAY7_HTML = `
  <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:8px;max-width:520px">
    <h2 style="color:#a3e635;margin-top:0">Your week-1 savings report</h2>
    <p>If you've been using Freeloader instead of OpenAI GPT-4, here's what you saved:</p>
    <div style="background:#1e293b;padding:16px;border-radius:4px;margin:16px 0">
      <p style="margin:4px 0">1M tokens @ GPT-4 prices = <span style="color:#ef4444">~$30</span></p>
      <p style="margin:4px 0">1M tokens via Freeloader = <span style="color:#22c55e">$0</span></p>
      <p style="margin:8px 0 0;font-size:20px;color:#a3e635">Saved: $30 (and counting)</p>
    </div>
    <p>Star us on <a href="https://github.com/xswarm/freeloader" style="color:#a3e635">GitHub</a> if Freeloader is saving you money.</p>
  </div>
`;

export const sequences: Record<string, EmailSequence> = {
  onboarding: {
    name: 'onboarding',
    steps: [
      { day: 0, subject: 'Welcome to Freeloader — your AI provider hates this', html: WELCOME_HTML('') },
      { day: 3, subject: '3 tips to get the most out of free AI tiers', html: DAY3_HTML },
      { day: 7, subject: 'Your week-1 savings report is ready', html: DAY7_HTML },
    ],
  },
};

export async function enrollUser(userId: number, email: string, sequenceName: string) {
  const sequence = sequences[sequenceName];
  if (!sequence) return;
  const db = getDb();
  for (const step of sequence.steps) {
    if (step.day === 0) {
      const html = sequenceName === 'onboarding' ? WELCOME_HTML(email) : step.html;
      await sendEmail(email, step.subject, html);
      await db.execute({
        sql: 'INSERT INTO email_sequences (user_id, sequence_name, step, sent_at) VALUES (?, ?, ?, datetime("now"))',
        args: [userId, sequenceName, step.day],
      });
    }
    // Future steps scheduled by a cron/queue worker
  }
}
