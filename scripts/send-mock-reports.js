#!/usr/bin/env node
// :arch: end-to-end report test — seeds mock data, builds multi-range report, sends via Resend, saves PDF
// :deps: seed-mock-data, DigestBuilder, Mailer
// :rules: requires RESEND_API_KEY and ADMIN_EMAIL env vars for email; always saves PDF locally
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrator.js';
import { seedMockData } from './seed-mock-data.js';
import { DigestBuilder } from '../src/email/digest.js';
import { Mailer } from '../src/email/mailer.js';
//
const DB_PATH = process.argv[2] || path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm', 'freeloader.db');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
//
async function main() {
  console.log('\n  xswarm-freeloader report generator\n');
  //
  // 1. Seed mock data
  console.log('  Step 1: Seeding mock data...');
  await seedMockData(DB_PATH);
  //
  // 2. Build multi-range report
  console.log('\n  Step 2: Building multi-range report...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  //
  const logger = { info: (m) => console.log(`    ${m}`), warn: (m) => console.warn(`    ${m}`), error: (m) => console.error(`    ${m}`), debug: () => {} };
  const builder = new DigestBuilder(db, logger);
  const report = await builder.buildReport();
  console.log(`    Subject: ${report.subject}`);
  console.log(`    PDF saved: ${report.savedPath || 'not saved'}`);
  //
  // 3. Send via Resend if configured
  if (RESEND_API_KEY && ADMIN_EMAIL) {
    console.log(`\n  Step 3: Sending to ${ADMIN_EMAIL} via Resend...`);
    const mailer = new Mailer({
      email: { enabled: true, provider: 'resend', apiKey: RESEND_API_KEY }
    }, logger);
    //
    if (mailer.isConfigured()) {
      const sent = await mailer.send(ADMIN_EMAIL, report.subject, report.html, report.attachments);
      console.log(sent ? '    Email sent successfully!' : '    Email send failed');
    } else {
      console.log('    Mailer not configured properly');
    }
  } else {
    console.log('\n  Step 3: Skipping email (set RESEND_API_KEY and ADMIN_EMAIL env vars)');
  }
  //
  // 4. Summary
  console.log(`\n  Done!`);
  if (report.savedPath) console.log(`  PDF: ${report.savedPath}`);
  console.log(`  HTML preview: save report.html locally to view in browser\n`);
  //
  db.close();
}
//
main().catch(err => { console.error('Failed:', err); process.exit(1); });
