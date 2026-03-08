import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function initDatabase(dbPath, options = {}) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath, {
    verbose: options.verbose ? console.log : undefined
  });

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function getDefaultDbPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, '.xswarm', 'freeloader.db');
}

export function closeDatabase(db) {
  if (db && db.open) {
    db.close();
  }
}

export function createTestDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}
