import { mkdtempSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/storage/db.js';
import { createRepo } from '../src/storage/repo.js';
import { backupDatabase } from '../scripts/backup.js';

describe('database backup', () => {
  it('writes a readable snapshot and refuses to overwrite', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fikaai-'));
    const src = path.join(dir, 'live.sqlite');
    const db = openDatabase(src);
    createRepo(db).ensureUser('farmer-1', 'Test');
    db.close();

    const dest = path.join(dir, 'backups', 'snap.sqlite');
    backupDatabase(src, dest);
    expect(existsSync(dest)).toBe(true);
    const copy = new DatabaseSync(dest);
    expect(copy.prepare('SELECT id FROM users WHERE id = ?').get('farmer-1')).toBeTruthy();
    copy.close();

    expect(() => backupDatabase(src, dest)).toThrow(/overwrite/);
    expect(() => backupDatabase(path.join(dir, 'missing.sqlite'), path.join(dir, 'x.sqlite'))).toThrow(/not found/);
  });
});
