import crypto from 'node:crypto';

/**
 * @typedef {Object} UserMessage
 * @property {string} id
 * @property {string} userId
 * @property {'web'|'sms'|'ussd'} channel
 * @property {string} text
 * @property {string} timestamp
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} AgentResponse
 * @property {string} text
 * @property {string} [intent]
 * @property {Array<{type: string, name?: string, detail?: string}>} [actions]
 * @property {boolean} [requiresSync]
 * @property {'rules'|'local'|'qwen'} [tier]
 * @property {string} [provider]
 * @property {string} [model]
 */

export function createUserMessage(userId, channel, text, metadata = {}) {
  return {
    id: crypto.randomUUID(),
    userId,
    channel,
    text: String(text ?? ''),
    timestamp: new Date().toISOString(),
    metadata,
  };
}
