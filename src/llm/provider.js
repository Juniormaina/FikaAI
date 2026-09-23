import { formatKes, formatQuantity } from '../i18n/format.js';
import { t } from '../i18n/language.js';
import { createModelScopeProvider } from './modelscope.js';
import {
  DEFAULT_MODELSCOPE_MODEL,
  MODELSCOPE_MODELS,
  assertAllowedModelScopeModel,
  isAllowedModelScopeModel,
} from './modelscope-models.js';

export {
  DEFAULT_MODELSCOPE_MODEL,
  MODELSCOPE_MODELS,
  assertAllowedModelScopeModel,
  isAllowedModelScopeModel,
  createModelScopeProvider,
};

export const SYSTEM_PROMPT = `You are FikaAI, an on-device assistant for people who may be using SMS or USSD.
Reply briefly in the language requested by the LANGUAGE line (en, sw, or mixed).
Use only RECORDS_JSON for anything about the user's sales. Never invent records, prices, or weather.
If RECORDS_JSON is empty and the user asks what they recorded, say there is nothing stored.
Keep the answer short enough to read on a small phone.`;

export function buildLlmPrompt({ task, language, records, userText }) {
  return [
    `TASK: ${task}`,
    `LANGUAGE: ${language}`,
    'RECORDS_JSON_START',
    JSON.stringify(records),
    'RECORDS_JSON_END',
    `USER: ${userText}`,
  ].join('\n');
}

function extractRecords(prompt) {
  const match = String(prompt || '').match(/RECORDS_JSON_START\n([\s\S]*?)\nRECORDS_JSON_END/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarize(records, language) {
  const lang = language === 'sw' ? 'sw' : 'en';
  if (!records.length) return t(lang, 'explainEmpty');
  const lines = records.map((record) => {
    const name = lang === 'sw' ? (record.itemSw || record.item) : (record.itemEn || record.item);
    const quantity = formatQuantity(record.quantity, record.unit, lang);
    return quantity
      ? `- ${name}, ${quantity}, ${record.amountLabel}`
      : `- ${name}, ${record.amountLabel}`;
  });
  const total = formatKes(records.reduce((sum, record) => sum + Number(record.amountKes), 0));
  const intro = t(lang, 'explainIntro', {
    count: records.length,
    noun: records.length === 1 ? 'sale' : 'sales',
  });
  return `${intro}\n${lines.join('\n')}\n${t(lang, 'explainTotal', { amount: total })}`;
}

function modelListed(models, model) {
  const wanted = String(model || '').trim();
  if (!wanted) return false;
  return (models || []).some((entry) => {
    const name = String(entry?.name || entry?.model || '');
    return name === wanted || name.startsWith(`${wanted}@`);
  });
}

export function createMockLlm() {
  return {
    name: 'mock',
    async isAvailable() {
      return true;
    },
    async status() {
      return { provider: 'mock', model: 'local-template', available: true, reason: 'ready' };
    },
    async generate(request) {
      const prompt = request?.prompt || '';
      const language = (prompt.match(/^LANGUAGE:\s*(\w+)/m) || [])[1] || 'en';
      const task = (prompt.match(/^TASK:\s*(\w+)/m) || [])[1] || 'chat';
      const lang = language === 'sw' ? 'sw' : language === 'mixed' ? 'mixed' : 'en';
      const text = task === 'explain'
        ? summarize(extractRecords(prompt), language)
        : t(lang, 'chatFallback');
      return { text, provider: 'mock', model: 'local-template' };
    },
  };
}

export function createOllamaProvider({ baseUrl, model, enabled, logger = console }) {
  let cache = { at: 0, ok: false, reason: 'unchecked' };
  return {
    name: 'ollama',
    model,
    async isAvailable() {
      if (!enabled) {
        cache = { at: Date.now(), ok: false, reason: 'disabled' };
        return false;
      }
      if (Date.now() - cache.at < 5000) return cache.ok;
      try {
        const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(800) });
        if (!response.ok) {
          cache = { at: Date.now(), ok: false, reason: `tags_http_${response.status}` };
          return false;
        }
        const body = await response.json();
        const ok = modelListed(body.models, model);
        cache = {
          at: Date.now(),
          ok,
          reason: ok ? 'ready' : `model_missing:${model}`,
        };
      } catch (error) {
        cache = {
          at: Date.now(),
          ok: false,
          reason: error instanceof Error ? error.message : 'unreachable',
        };
      }
      return cache.ok;
    },
    async status() {
      await this.isAvailable();
      return {
        provider: 'ollama',
        model,
        available: cache.ok,
        reason: cache.reason,
      };
    },
    async generate(request) {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          system: request.system,
          prompt: request.prompt,
          stream: false,
          options: { temperature: request.temperature ?? 0.2 },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Ollama responded with ${response.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`);
      }
      const body = await response.json();
      const text = String(body.response || '').trim();
      if (!text) throw new Error('Ollama returned an empty response');
      return { text, provider: 'ollama', model };
    },
    logger,
  };
}

/**
 * Tries providers in order. Never requires the agent to know which backend won.
 */
export function createProviderRouter(providers, { logger = console, mode = 'auto' } = {}) {
  const chain = providers.filter(Boolean);
  let lastProvider = 'mock';
  let lastReason = 'startup';
  let lastModel = null;

  return {
    name: 'router',
    mode,
    async status() {
      const details = [];
      for (const provider of chain) {
        const status = typeof provider.status === 'function'
          ? await provider.status()
          : { provider: provider.name, available: await provider.isAvailable?.() };
        details.push(status);
      }
      const preferred = details.find((item) => item.available) || details[details.length - 1] || {
        provider: 'mock',
        available: false,
        reason: 'empty_chain',
      };
      return {
        provider: preferred.provider,
        model: preferred.model ?? lastModel,
        available: Boolean(preferred.available),
        reason: preferred.reason || null,
        mode,
        lastProvider,
        lastReason,
        lastModel,
        providers: details.map((item) => ({
          provider: item.provider,
          model: item.model ?? null,
          available: Boolean(item.available),
          reason: item.reason || null,
          configured: item.configured,
        })),
      };
    },
    async generate(request) {
      const errors = [];
      for (const provider of chain) {
        const ready = typeof provider.isAvailable === 'function'
          ? await provider.isAvailable()
          : true;
        if (!ready) {
          const status = typeof provider.status === 'function' ? await provider.status() : null;
          errors.push(`${provider.name}:${status?.reason || 'unavailable'}`);
          continue;
        }
        try {
          const result = await provider.generate(request);
          lastProvider = result.provider || provider.name;
          lastModel = result.model || null;
          lastReason = 'ok';
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'error';
          errors.push(`${provider.name}:${message}`);
          logger.warn(`[fikaai] Provider ${provider.name} failed (${message}). Trying next.`);
        }
      }
      lastProvider = 'mock';
      lastModel = 'local-template';
      lastReason = errors.join(' | ') || 'no_provider';
      logger.warn(`[fikaai] Falling back to provider=mock (${lastReason}).`);
      const mock = createMockLlm();
      const result = await mock.generate(request);
      return { ...result, fallbackReason: lastReason };
    },
  };
}

export function createDefaultLlm(config, { connectivity = null, logger = console, getModelScopeModel = null } = {}) {
  const mode = String(config.llmProvider || 'auto').toLowerCase();
  const mock = createMockLlm();
  const ollama = createOllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    enabled: config.ollamaEnabled,
    logger,
  });
  const modelscope = createModelScopeProvider({
    baseUrl: config.modelscopeBaseUrl,
    apiKey: config.modelscopeApiKey,
    getModel: getModelScopeModel || (() => config.modelscopeModel),
    connectivity,
    logger,
  });

  if (mode === 'mock') {
    return createProviderRouter([mock], { logger, mode });
  }
  if (mode === 'ollama') {
    return createProviderRouter([ollama, mock], { logger, mode });
  }
  if (mode === 'modelscope') {
    // Prefer hosted when forced; fall back to local Ollama, then mock.
    return createProviderRouter([modelscope, ollama, mock], { logger, mode });
  }
  // auto: online hosted brain first when configured, else local Ollama, else mock.
  return createProviderRouter([modelscope, ollama, mock], { logger, mode: 'auto' });
}
