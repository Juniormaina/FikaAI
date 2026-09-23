import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function flag(value, fallback = true) {
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3000,
    host: env.HOST || '127.0.0.1',
    databasePath: env.DATABASE_PATH || path.join(root, 'data', 'fikaai.sqlite'),
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    ollamaModel: env.OLLAMA_MODEL || 'qwen2.5:3b',
    ollamaEnabled: flag(env.OLLAMA_ENABLED, true),
    defaultUserId: env.DEFAULT_USER_ID || 'demo-user',
    connectivityMode: String(env.CONNECTIVITY_MODE || '').toLowerCase() === 'offline' ? 'offline' : 'online',
    root,
  };
}
