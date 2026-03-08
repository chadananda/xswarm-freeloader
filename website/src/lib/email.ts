import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) _resend = new Resend(import.meta.env.RESEND_API_KEY);
  return _resend;
}

export async function sendMagicLink(email: string, token: string, baseUrl: string) {
  const link = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  return getResend().emails.send({
    from: 'Freeloader <noreply@freeloader.xswarm.ai>',
    to: email,
    subject: 'Your magic link to Freeloader',
    html: `
      <div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:8px;max-width:480px">
        <h2 style="color:#a3e635;margin-top:0">Your AI's worst nightmare just got a login link</h2>
        <p>Click below to sign in to Freeloader. Link expires in 15 minutes.</p>
        <a href="${link}" style="display:inline-block;background:#a3e635;color:#0f172a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;margin:16px 0">Sign In</a>
        <p style="color:#64748b;font-size:12px">If you didn't request this, ignore it. Someone else typed your email.</p>
      </div>
    `,
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  return getResend().emails.send({
    from: 'Freeloader <noreply@freeloader.xswarm.ai>',
    to,
    subject,
    html,
  });
}
