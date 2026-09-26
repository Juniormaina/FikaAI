#!/usr/bin/env node
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/storage/db.js';
import { createRepo } from '../src/storage/repo.js';
import { seedProviders } from '../src/healthcare/care.js';
import { SYNTHETIC_PROVIDERS } from '../src/healthcare/providers-data.js';

const force = process.argv.includes('--force');
const config = loadConfig();
const db = openDatabase(config.databasePath);
const repo = createRepo(db);

if (force) {
  for (const provider of SYNTHETIC_PROVIDERS) {
    db.prepare('DELETE FROM providers WHERE id = ?').run(provider.id);
  }
  // Also clear any leftover providers not in the current seed set.
  db.prepare('DELETE FROM providers').run();
}

const result = seedProviders(repo);
console.log(JSON.stringify({
  ok: true,
  database: config.databasePath,
  ...result,
  force,
}, null, 2));
