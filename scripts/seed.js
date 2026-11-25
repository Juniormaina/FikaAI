#!/usr/bin/env node
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/storage/db.js';
import { createRepo } from '../src/storage/repo.js';
import { seedAdvisories } from '../src/guidance/guidance.js';

const force = process.argv.includes('--force');
const config = loadConfig();
const db = openDatabase(config.databasePath);
const repo = createRepo(db);

if (force) repo.clearAdvisories();

const result = seedAdvisories(repo);
console.log(JSON.stringify({
  ok: true,
  database: config.databasePath,
  ...result,
  force,
}, null, 2));
