import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { createMockLlm } from '../src/llm/provider.js';
import { listen } from './helpers.js';

const sent = [];
let ctx;
let server;

function make(config = {}) {
  sent.length = 0;
  return createApp({
    databasePath: ':memory:',
    llm: createMockLlm(),
    smsSender: { name: 'test', async send(msg) { sent.push(msg); } },
    config: {
      defaultUserId: 'demo-user', host: '127.0.0.1', port: 0, ollamaEnabled: false,
      llmProvider: 'mock', modelscopeApiKey: '', root: process.cwd(), authRequired: true, ...config,
    },
  });
}

const form = (obj) => new URLSearchParams(obj).toString();

async function post(path, body, { json = false, token } = {}) {
  const res = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: json ? JSON.stringify(body) : form(body),
  });
  const text = await res.text();
  return { status: res.status, text, type: res.headers.get('content-type') };
}

async function webSession(phone) {
  await post('/api/auth/request-code', { phone }, { json: true });
  const code = /(\d{6})/.exec(sent.at(-1).text)[1];
  const r = await post('/api/auth/verify', { phone, code }, { json: true });
  return JSON.parse(r.text).token;
}

afterEach(async () => {
  await server.close();
  ctx.db.close();
});

describe("Africa's Talking callbacks", () => {
  beforeEach(async () => {
    ctx = make({ atWebhookSecret: 's3cret' });
    server = await listen(ctx.app);
  });

  it('rejects callbacks without the shared secret', async () => {
    expect((await post('/api/at/ussd', { phoneNumber: '+254712345678', text: '' })).status).toBe(401);
    expect((await post('/api/at/ussd?key=wrong', { phoneNumber: '+254712345678', text: '' })).status).toBe(401);
    expect((await post('/api/at/sms', { from: '+254712345678', text: 'help' })).status).toBe(401);
  });

  it('answers USSD as plain text CON screens within 182 characters', async () => {
    const menu = await post('/api/at/ussd?key=s3cret', { phoneNumber: '+254712345678', text: '', sessionId: 'a' });
    expect(menu.status).toBe(200);
    expect(menu.type).toContain('text/plain');
    expect(menu.text.startsWith('CON FIKAAI AGRO ADVISORY')).toBe(true);
    expect(menu.text.length).toBeLessThanOrEqual(182);

    const poultry = await post('/api/at/ussd?key=s3cret', { phoneNumber: '+254712345678', text: '5', sessionId: 'a' });
    expect(poultry.text).toContain('POULTRY GUIDE');
    const brooding = await post('/api/at/ussd?key=s3cret', { phoneNumber: '+254712345678', text: '5*2', sessionId: 'a' });
    expect(brooding.text).toContain('Brooding chicks');
  });

  it("puts a USSD sale into the farmer's signed-in web account", async () => {
    const phone = '0712345678';
    const token = await webSession(phone);
    await post('/api/at/ussd?key=s3cret', { phoneNumber: '+254712345678', text: '2' });
    await post('/api/at/ussd?key=s3cret', { phoneNumber: '+254712345678', text: '2*MAIZE 4500' });
    const res = await fetch(`${server.url}/api/records`, { headers: { Authorization: `Bearer ${token}` } });
    const { records } = await res.json();
    expect(records.length).toBe(1);
    expect(records[0].amountKes).toBe(4500);
  });

  it('replies to inbound SMS from the same number', async () => {
    const r = await post('/api/at/sms?key=s3cret', { from: '+254712345678', to: '20880', text: 'I sold three bags of maize for 4500.' });
    expect(r.status).toBe(200);
    expect(sent.at(-1).to).toBe('254712345678');
    expect(sent.at(-1).text).toContain('Recorded: maize sale');
  });

  it('rejects bad input', async () => {
    expect((await post('/api/at/sms?key=s3cret', { from: 'x', text: 'hi' })).status).toBe(400);
    const u = await post('/api/at/ussd?key=s3cret', { phoneNumber: 'nope', text: '' });
    expect(u.text.startsWith('END')).toBe(true);
  });
});

describe('callbacks disabled by default', () => {
  beforeEach(async () => {
    ctx = make();
    server = await listen(ctx.app);
  });

  it('returns 503 when AT_WEBHOOK_SECRET is not set', async () => {
    expect((await post('/api/at/ussd?key=anything', { phoneNumber: '+254712345678', text: '' })).status).toBe(503);
  });
});
