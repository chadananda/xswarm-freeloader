import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const XSWARM_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm');

export async function remove() {
  console.log('\n🗑️  xswarm-freeloader removal\n');

  // Stop pm2 processes
  try {
    execSync('pm2 delete xswarm-router xswarm-dashboard 2>/dev/null', { stdio: 'ignore' });
    execSync('pm2 save', { stdio: 'ignore' });
    console.log('  ✓ Stopped pm2 processes');
  } catch {
    console.log('  ℹ No pm2 processes to stop');
  }

  // Prompt to remove data
  if (fs.existsSync(XSWARM_DIR)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('  Remove ~/.xswarm/ data directory? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() === 'y') {
      fs.rmSync(XSWARM_DIR, { recursive: true, force: true });
      console.log('  ✓ Removed ~/.xswarm/');
    } else {
      console.log('  ℹ Kept ~/.xswarm/');
    }
  }

  console.log('\n  Done.\n');
}
