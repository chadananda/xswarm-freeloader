import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { initDatabase } from '../db/db.js';
import { UsageRepository, AppRepository, BudgetRepository } from '../db/repositories/index.js';

const XSWARM_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm');

export async function status() {
  console.log('\n📊 xswarm-freeloader status\n');

  // pm2 processes
  try {
    const list = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8' }) || '[]');
    const xswarmProcesses = list.filter(p => p.name.startsWith('xswarm-'));

    if (xswarmProcesses.length === 0) {
      console.log('  ℹ No xswarm processes running');
    } else {
      for (const proc of xswarmProcesses) {
        const status = proc.pm2_env?.status || 'unknown';
        const uptime = proc.pm2_env?.pm_uptime ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000) : 0;
        const icon = status === 'online' ? '🟢' : '🔴';
        console.log(`  ${icon} ${proc.name}: ${status} (uptime: ${formatUptime(uptime)})`);
      }
    }
  } catch {
    console.log('  ℹ pm2 not available');
  }

  // Database stats
  const dbPath = path.join(XSWARM_DIR, 'freeloader.db');
  if (fs.existsSync(dbPath)) {
    try {
      const db = initDatabase(dbPath);
      const usage = new UsageRepository(db);
      const apps = new AppRepository(db);
      const budgets = new BudgetRepository(db);

      const dayStats = usage.getStats(null, 'day');
      const monthStats = usage.getStats(null, 'month');
      const appList = apps.getAll();

      console.log(`\n  Apps: ${appList.length}`);
      console.log(`  Today: ${dayStats?.requests || 0} requests, $${(dayStats?.total_cost || 0).toFixed(4)} cost`);
      console.log(`  Month: ${monthStats?.requests || 0} requests, $${(monthStats?.total_cost || 0).toFixed(4)} cost`);

      db.close();
    } catch (err) {
      console.log(`  ℹ Database error: ${err.message}`);
    }
  } else {
    console.log('\n  ℹ No database found. Run `npx xswarm-freeloader` to set up.');
  }

  console.log('');
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
