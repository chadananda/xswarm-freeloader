import nodemailer from 'nodemailer';

export class Mailer {
  constructor(config, logger) {
    this.config = config?.email || {};
    this.logger = logger;
    this.transporter = null;

    if (this.config.enabled && this.config.smtp?.host) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port || 587,
        secure: this.config.smtp.secure || false,
        auth: {
          user: this.config.smtp.user,
          pass: this.config.smtp.pass
        }
      });
    }
  }

  async send(to, subject, html) {
    if (!this.transporter) {
      this.logger?.debug?.('Email not configured, skipping send');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.smtp.user || 'xswarm-freeloader@localhost',
        to,
        subject,
        html
      });
      this.logger?.info?.(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger?.error?.(`Failed to send email: ${err.message}`);
      return false;
    }
  }

  isConfigured() {
    return !!this.transporter;
  }
}
