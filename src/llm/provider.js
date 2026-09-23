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

export function createOllamaProvider({ baseUrl, model, enabled }) {
  let cache = { at: 0, ok: false };
  return {
    name: 'ollama',
    model,
    async isAvailable() {
      if (!enabled) return false;
      if (Date.now() - cache.at < 5000) return cache.ok;
      try {
        const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(400) });
        cache = { at: Date.now(), ok: response.ok };
      } catch {
        cache = { at: Date.now(), ok: false };
      }
      return cache.ok;
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
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Ollama responded with ${response.status}`);
      const body = await response.json();
      const text = String(body.response || '').trim();
      if (!text) throw new Error('Ollama returned an empty response');
      return { text, provider: 'ollama', model };
    },
  };
}

export function createFallbackLlm(primary, fallback) {
  return {
    name: 'fallback',
    async generate(request) {
      if (await primary.isAvailable()) {
        try {
          return await primary.generate(request);
        } catch {
          // Local template still answers from stored records.
        }
      }
      return fallback.generate(request);
    },
  };
}

export function createDefaultLlm(config) {
  return createFallbackLlm(
    createOllamaProvider({
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
      enabled: config.ollamaEnabled,
    }),
    createMockLlm(),
  );
}
