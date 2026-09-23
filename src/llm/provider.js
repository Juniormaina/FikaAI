import { formatKes, formatQuantity } from '../i18n/format.js';
import { t } from '../i18n/language.js';

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

export function createFallbackLlm(primary, fallback, { logger = console } = {}) {
  let lastProvider = 'mock';
  let lastReason = 'startup';
  return {
    name: 'fallback',
    async status() {
      if (typeof primary.status === 'function') {
        const status = await primary.status();
        return {
          ...status,
          lastProvider,
          lastReason,
          fallback: 'mock',
        };
      }
      return {
        provider: primary.name,
        available: false,
        lastProvider,
        lastReason,
        fallback: 'mock',
      };
    },
    async generate(request) {
      if (await primary.isAvailable()) {
        try {
          const result = await primary.generate(request);
          lastProvider = result.provider || primary.name;
          lastReason = 'ollama';
          return result;
        } catch (error) {
          lastProvider = 'mock';
          lastReason = error instanceof Error ? error.message : 'ollama_error';
          logger.warn(
            `[fikaai] Ollama request failed (${lastReason}). Falling back to provider=mock.`,
          );
        }
      } else {
        const status = typeof primary.status === 'function' ? await primary.status() : null;
        lastProvider = 'mock';
        lastReason = status?.reason || 'ollama_unavailable';
        logger.warn(
          `[fikaai] Ollama unavailable (${lastReason}). Using provider=mock.`,
        );
      }
      const result = await fallback.generate(request);
      return { ...result, provider: 'mock', fallbackReason: lastReason };
    },
  };
}

export function createDefaultLlm(config, { logger = console } = {}) {
  return createFallbackLlm(
    createOllamaProvider({
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
      enabled: config.ollamaEnabled,
      logger,
    }),
    createMockLlm(),
    { logger },
  );
}
