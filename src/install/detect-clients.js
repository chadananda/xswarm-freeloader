import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || process.env.USERPROFILE;

const CLIENT_CONFIGS = [
  {
    name: 'Continue',
    paths: [
      path.join(HOME, '.continue', 'config.json'),
      path.join(HOME, '.continue', 'config.yaml')
    ],
    instruction: 'Set base URL to http://localhost:4011/v1 in Continue config'
  },
  {
    name: 'Cursor',
    paths: [
      path.join(HOME, '.cursor', 'settings.json'),
      path.join(HOME, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json')
    ],
    instruction: 'Set openai.apiBase to http://localhost:4011/v1 in Cursor settings'
  },
  {
    name: 'OpenCommit',
    paths: [path.join(HOME, '.opencommit')],
    instruction: 'Set OCO_API_URL=http://localhost:4011/v1 in .opencommit config'
  }
];

export function detectClients() {
  const found = [];

  for (const client of CLIENT_CONFIGS) {
    for (const configPath of client.paths) {
      if (fs.existsSync(configPath)) {
        found.push({
          name: client.name,
          configPath,
          instruction: client.instruction
        });
        break;
      }
    }
  }

  return found;
}

export function printClientInstructions(clients) {
  if (clients.length === 0) return;

  console.log('\n  Detected AI clients:');
  for (const client of clients) {
    console.log(`    ${client.name}: ${client.instruction}`);
  }
}
