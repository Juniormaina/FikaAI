import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_MODELSCOPE_MODEL,
  isAllowedModelScopeModel,
} from './llm/modelscope-models.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function flag(value, fallback = true) {
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function normalizeProvider(value) {
  const mode = String(value || 'auto').toLowerCase().trim();
  if (['auto', 'ollama', 'modelscope', 'mock'].includes(mode)) return mode;
  return 'auto';
}

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  const modelscopeModel = String(env.MODELSCOPE_MODEL || DEFAULT_MODELSCOPE_MODEL).trim();
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3000,
    host: env.HOST || '127.0.0.1',
    databasePath: env.DATABASE_PATH || path.join(root, 'data', 'fikaai.sqlite'),
    ollamaBaseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    ollamaModel: env.OLLAMA_MODEL || 'qwen2.5:3b',
    ollamaEnabled: flag(env.OLLAMA_ENABLED, true),
    modelscopeBaseUrl: env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.ai/v1',
    modelscopeApiKey: String(env.MODELSCOPE_API_KEY || '').trim(),
    modelscopeModel: isAllowedModelScopeModel(modelscopeModel)
      ? modelscopeModel
      : DEFAULT_MODELSCOPE_MODEL,
    llmProvider: normalizeProvider(env.LLM_PROVIDER),
    authRequired: flag(env.AUTH_REQUIRED, false),
    authDemoCodes: flag(env.AUTH_DEMO_CODES, false),
    atUsername: String(env.AT_USERNAME || '').trim(),
    atApiKey: String(env.AT_API_KEY || '').trim(),
    atSenderId: String(env.AT_SENDER_ID || '').trim(),
    atWebhookSecret: String(env.AT_WEBHOOK_SECRET || '').trim(),
    atSandbox: flag(env.AT_SANDBOX, false),
    defaultUserId: env.DEFAULT_USER_ID || 'demo-user',
    connectivityMode: String(env.CONNECTIVITY_MODE || '').toLowerCase() === 'offline' ? 'offline' : 'online',
    root,
  };
}
