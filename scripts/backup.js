// Consistent snapshot of the SQLite database: npm run backup [-- destination.sqlite]
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { loadConfig } from '../src/config.js';

export function backupDatabase(source, destination) {
  if (!existsSync(source)) throw new Error(`Database not found: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite ${destination}`);
  mkdirSync(path.dirname(destination), { recursive: true });
  const db = new DatabaseSync(source);
  try {
    db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`);
  } finally {
    db.close();
  }
  return destination;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { databasePath } = loadConfig();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = process.argv[2] || path.join(path.dirname(databasePath), 'backups', `fikaai-${stamp}.sqlite`);
  console.log(`Backup written to ${backupDatabase(databasePath, target)}`);
}
