import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  text TEXT NOT NULL,
  intent TEXT,
  tier TEXT,
  provider TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  amount_kes REAL NOT NULL,
  note TEXT,
  recorded_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_queue (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  text TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  response_text TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS ussd_sessions (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  state TEXT NOT NULL,
  mode TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_activity (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  step TEXT NOT NULL,
  detail TEXT NOT NULL,
  tier TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  location TEXT NOT NULL,
  county TEXT NOT NULL,
  specialties TEXT NOT NULL,
  specialist_name TEXT NOT NULL,
  availability_status TEXT NOT NULL,
  availability_note TEXT,
  appointment_required INTEGER NOT NULL DEFAULT 1,
  referral_required INTEGER NOT NULL DEFAULT 0,
  contact_information TEXT,
  instructions TEXT,
  last_updated TEXT NOT NULL,
  data_source TEXT NOT NULL,
  is_demo_data INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS journeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  intent_json TEXT,
  query_text TEXT,
  provider_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journey_actions (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL REFERENCES journeys(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  payload_json TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  journey_id TEXT,
  rating TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);
`;

export function openDatabase(filename) {
  if (filename !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec(SCHEMA);
  const messageColumns = db.prepare('PRAGMA table_info(messages)').all();
  if (!messageColumns.some((column) => column.name === 'provider')) {
    db.exec('ALTER TABLE messages ADD COLUMN provider TEXT');
  }
  return db;
}
