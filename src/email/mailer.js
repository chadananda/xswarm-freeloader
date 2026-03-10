// :arch: email sender — Resend SMTP auto-config, generic SMTP, or local sendmail; strictly opt-in
// :why: user data never leaves the machine unless email is explicitly enabled + configured
// :deps: nodemailer; consumers: scheduler.js, app.js report/test endpoints
// :rules: no auto-detection; transport only created when email.enabled === true AND provider/smtp configured
import nodemailer from 'nodemailer';
//
export class Mailer {
  constructor(config, logger) {
    this.config = config?.email || {};
    this.logger = logger;
    this.transporter = null;
    this.transportType = null;
    //
    // Only create transport if user explicitly opted in
    if (this.config.enabled !== true) return;
    //
    // Resend auto-config: just needs an API key
    if (this.config.provider === 'resend' && this.config.apiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: this.config.apiKey }
      });
      this.transportType = 'resend';
    } else if (this.config.smtp?.host) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port || 587,
        secure: this.config.smtp.secure || false,
        auth: { user: this.config.smtp.user, pass: this.config.smtp.pass }
      });
      this.transportType = 'smtp';
    } else if (this.config.sendmailPath) {
      // User explicitly set a sendmail path
      this.transporter = nodemailer.createTransport({ sendmail: true, path: this.config.sendmailPath });
      this.transportType = 'sendmail';
    }
    //
    if (this.transporter) {
      this.logger?.info?.(`Email transport: ${this.transportType}`);
    } else {
      this.logger?.warn?.('Email enabled but no provider/SMTP/sendmail configured');
    }
  }
  //
  async send(to, subject, html, attachments) {
    if (!this.transporter) {
      this.logger?.debug?.('Email not configured, skipping send');
      return false;
    }
    try {
      const from = this.config.from || (this.transportType === 'resend' ? 'xswarm <onboarding@resend.dev>' : this.config.smtp?.user || 'xswarm-freeloader@localhost');
      const mailOptions = { from, to, subject, html };
      if (attachments?.length) mailOptions.attachments = attachments;
      await this.transporter.sendMail(mailOptions);
      this.logger?.info?.(`Email sent (${this.transportType}) to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger?.error?.(`Failed to send email: ${err.message}`);
      return false;
    }
  }
  //
  isConfigured() {
    return !!this.transporter;
  }
}
