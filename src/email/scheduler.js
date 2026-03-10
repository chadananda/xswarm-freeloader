import { Mailer } from './mailer.js';
import { DigestBuilder } from './digest.js';

export class EmailScheduler {
  constructor(config, db, logger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.mailer = new Mailer(config, logger);
    this.digestBuilder = new DigestBuilder(db, logger);
    this.interval = null;
  }

  start() {
    if (!this.mailer.isConfigured() || !this.config.email?.to) {
      this.logger?.info?.('Email not configured, scheduler disabled');
      return;
    }

    const frequency = this.config.email?.digestFrequency || 'daily';
    if (frequency === 'never') return;

    const intervalMs = frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    this.logger?.info?.(`Email digest scheduled: ${frequency} to ${this.config.email.to}`);

    this.interval = setInterval(async () => {
      await this.sendDigest();
    }, intervalMs);

    // Send first digest 1 minute after startup (for testing)
    setTimeout(() => this.sendDigest(), 60000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async sendDigest() {
    try {
      const digest = await this.digestBuilder.buildDaily();
      await this.mailer.send(this.config.email.to, digest.subject, digest.html, digest.attachments);
    } catch (err) {
      this.logger?.error?.(`Failed to send digest: ${err.message}`);
    }
  }

  async sendAlert(alertData) {
    if (!this.config.email?.to) return;
    try {
      await this.mailer.send(this.config.email.to, alertData.subject, alertData.html);
    } catch (err) {
      this.logger?.error?.(`Failed to send alert: ${err.message}`);
    }
  }
}
