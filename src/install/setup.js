import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { initDatabase } from '../db/db.js';
import { runMigrations } from '../db/migrator.js';
import { ConfigLoader } from '../config/loader.js';
import { AppRepository } from '../db/repositories/apps.js';
import { CatalogSync } from '../providers/catalog-sync.js';
import { ProviderRepository, ModelRepository } from '../db/repositories/index.js';
import { hashPassword } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XSWARM_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm');

const QUIPS = [
  'Your AI provider just felt a disturbance in the force.',
  "OpenAI's billing team hates this one weird trick.",
  'Free tiers assembled. Wallets closed. Vibes immaculate.',
  'Your GPU bill called. It said goodbye.',
  'Achievement unlocked: $0/month AI infrastructure.',
  'The free tier cartel is now operational.',
  "Running on pure audacity and other people's free tiers.",
  'Corporate called. They want their margins back.',
  'Welcome to the free tier maximization era.',
  'Your API key works. Your credit card doesn\'t have to.',
  'Somewhere, a pricing page is crying.',
  'All your free tiers are belong to us.',
  'Budget status: aggressively zero.',
  'Providers hate him! Local dev saves $200/mo with this one trick.',
  'The revolution will not be billed.',
];

export async function setup(options = {}) {
  console.log(`
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  █▀▀ █▀▄ █▀▀ █▀▀ █   █▀█ █▀█ █▀▄ █▀▀ █▀▄  ┃
  ┃  █▀▀ █▀▄ █▀▀ █▀▀ █   █ █ █▀█ █ █ █▀▀ █▀▄  ┃
  ┃  ▀   ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀▀  ▀▀▀ ▀ ▀  ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

  // 1. Ensure pm2 is available
  ensurePm2();

  // 2. Create ~/.xswarm/ directory
  if (!fs.existsSync(XSWARM_DIR)) {
    fs.mkdirSync(XSWARM_DIR, { recursive: true });
    console.log('  ✓ Created ~/.xswarm/');
  }

  // 3. Initialize config
  const configLoader = new ConfigLoader();
  let dashboardPassword = null;
  if (!configLoader.exists()) {
    const config = configLoader.load();
    // Generate dashboard password on first setup
    dashboardPassword = crypto.randomBytes(4).toString('hex'); // 8-char hex
    config.dashboardPassword = hashPassword(dashboardPassword);
    configLoader.save(config);
    console.log('  ✓ Created config.json');
  } else if (!configLoader.load().dashboardPassword) {
    // Existing install missing a password — generate one
    dashboardPassword = crypto.randomBytes(4).toString('hex');
    configLoader.set('dashboardPassword', hashPassword(dashboardPassword));
  }

  // 4. Initialize database
  const dbPath = path.join(XSWARM_DIR, 'freeloader.db');
  const db = initDatabase(dbPath);
  runMigrations(db);
  console.log('  ✓ Database initialized');

  // 5. Sync catalog
  const providers = new ProviderRepository(db);
  const models = new ModelRepository(db);
  const config = configLoader.load();
  const catalogSync = new CatalogSync(providers, models, config);
  await catalogSync.sync();
  const providerCount = providers.getAll().length;
  const modelCount = models.getAll().length;
  console.log(`  ✓ Synced provider catalog (${providerCount} providers, ${modelCount} models)`);

  // 6. Create default app with API key
  const apps = new AppRepository(db);
  const existing = apps.getAll();
  let defaultApp;
  if (existing.length === 0) {
    defaultApp = apps.create({ name: 'default' });
    console.log(`  ✓ Default app created`);
    console.log(`    API Key: ${defaultApp.api_key}`);
  } else {
    defaultApp = existing[0];
    console.log(`  ✓ Using existing app: ${defaultApp.name}`);
  }

  db.close();

  // 7. Start pm2 process (router serves dashboard static files)
  const routerScript = path.resolve(__dirname, '..', 'router', 'server.js');

  if (options.restart) {
    try { execSync('pm2 delete xswarm-router xswarm-dashboard 2>/dev/null', { stdio: 'ignore' }); } catch {}
  }

  startPm2Process('xswarm-router', routerScript);

  // 8. pm2 startup + save
  try {
    const startupCmd = execSync('pm2 startup 2>&1', { encoding: 'utf8' });
    const sudoMatch = startupCmd.match(/sudo .+/);
    if (sudoMatch) {
      console.log(`\n  To enable auto-start on boot, run:\n  ${sudoMatch[0]}\n`);
    }
  } catch {}

  try { execSync('pm2 save', { stdio: 'ignore' }); } catch {}

  // 9. Optional email prompt
  await promptEmail(configLoader);

  // 10. Open dashboard
  const routerPort = config.server?.routerPort || 4011;
  const dashboardUrl = `http://localhost:${routerPort}`;
  const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
  console.log(`\n  🔑 API Key:  ${defaultApp.api_key}`);
  if (dashboardPassword) {
    console.log(`  🔒 Password: ${dashboardPassword}`);
  }
  console.log(`\n  🚀 Dashboard: ${dashboardUrl}`);
  console.log(`  🔗 API:       ${dashboardUrl}/v1/`);
  console.log(`\n  ${quip}\n`);

  try {
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execSync(`${openCmd} ${dashboardUrl}`, { stdio: 'ignore' });
  } catch {}
}

function ensurePm2() {
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
    console.log('  ✓ pm2 found');
  } catch {
    console.log('  Installing pm2...');
    execSync('npm install -g pm2', { stdio: 'inherit' });
    console.log('  ✓ pm2 installed');
  }
}

function startPm2Process(name, script) {
  try {
    const list = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8' }) || '[]');
    const existing = list.find(p => p.name === name);
    if (existing && existing.pm2_env?.status === 'online') {
      console.log(`  ✓ ${name} already running`);
      return;
    }
  } catch {}

  try {
    execSync(`pm2 start ${script} --name ${name} --node-args="--experimental-modules"`, { stdio: 'ignore' });
    console.log(`  ✓ Started ${name}`);
  } catch (err) {
    console.error(`  ✗ Failed to start ${name}: ${err.message}`);
  }
}

async function promptEmail(configLoader) {
  const config = configLoader.load();
  if (config.email?.to) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question('  Email for daily digest (Enter to skip): ', (email) => {
      rl.close();
      if (email && email.includes('@')) {
        configLoader.set('email.to', email);
        configLoader.set('email.enabled', true);
        console.log(`  ✓ Email set to ${email}`);
      }
      resolve();
    });
  });
}
