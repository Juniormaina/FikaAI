import { assertAllowedModelScopeModel, isAllowedModelScopeModel } from './modelscope-models.js';

function redact(text, secret) {
  const value = String(text ?? '');
  if (!secret) return value;
  return value.split(secret).join('[redacted]');
}

function extractText(body) {
  const choice = body?.choices?.[0];
  const message = choice?.message?.content ?? choice?.text ?? body?.output_text;
  if (Array.isArray(message)) {
    return message
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('')
      .trim();
  }
  return String(message || '').trim();
}

/**
 * One OpenAI-compatible ModelScope provider. Model name is configuration, not
 * a separate provider implementation.
 */
export function createModelScopeProvider({
  baseUrl,
  apiKey,
  getModel,
  model,
  connectivity = null,
  logger = console,
  fetchImpl = fetch,
} = {}) {
  const resolveModel = () => {
    const configured = typeof getModel === 'function' ? getModel() : model;
    return assertAllowedModelScopeModel(configured);
  };

  return {
    name: 'modelscope',
    async isAvailable() {
      if (!apiKey) return false;
      try {
        resolveModel();
      } catch {
        return false;
      }
      if (connectivity && !(await connectivity.isOnline())) return false;
      return true;
    },
    async status() {
      const configured = typeof getModel === 'function' ? getModel() : model;
      const online = connectivity ? await connectivity.isOnline() : true;
      let reason = 'ready';
      let available = true;
      if (!apiKey) {
        available = false;
        reason = 'missing_api_key';
      } else if (!isAllowedModelScopeModel(configured)) {
        available = false;
        reason = 'invalid_model';
      } else if (!online) {
        available = false;
        reason = 'offline';
      }
      return {
        provider: 'modelscope',
        model: configured,
        available,
        reason,
        configured: Boolean(apiKey),
      };
    },
    async generate(request) {
      if (!apiKey) throw new Error('ModelScope API key is not configured');
      if (connectivity && !(await connectivity.isOnline())) {
        throw new Error('ModelScope skipped while offline');
      }
      const selected = resolveModel();
      const url = `${String(baseUrl).replace(/\/$/, '')}/chat/completions`;
      const messages = [];
      if (request.system) {
        messages.push({ role: 'system', content: request.system });
      }
      if (Array.isArray(request.messages) && request.messages.length) {
        messages.push(...request.messages);
      } else {
        messages.push({ role: 'user', content: request.prompt || '' });
      }

      let response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selected,
            messages,
            temperature: request.temperature ?? 0.2,
            stream: false,
          }),
          signal: AbortSignal.timeout(90000),
        });
      } catch (error) {
        const message = redact(error instanceof Error ? error.message : 'request failed', apiKey);
        logger.warn(`[fikaai] ModelScope request error (${message}).`);
        throw new Error(`ModelScope request failed: ${message}`);
      }

      const raw = await response.text();
      const safeRaw = redact(raw, apiKey);
      if (!response.ok) {
        throw new Error(`ModelScope responded with ${response.status}: ${safeRaw.slice(0, 180)}`);
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new Error('ModelScope returned non-JSON');
      }
      const text = extractText(body);
      if (!text) throw new Error('ModelScope returned an empty response');
      return { text, provider: 'modelscope', model: selected };
    },
  };
}
