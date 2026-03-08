import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(db) {
  const currentVersion = db.pragma('user_version', { simple: true });
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (let i = 0; i < files.length; i++) {
    const targetVersion = i + 1;
    if (currentVersion >= targetVersion) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, files[i]), 'utf8');

    try {
      db.exec('BEGIN TRANSACTION');
      db.exec(sql);
      db.pragma(`user_version = ${targetVersion}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${files[i]} failed: ${error.message}`);
    }
  }
}
