import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { createMockLlm } from '../src/llm/provider.js';
import { normalizePhone } from '../src/auth/auth.js';
import { listen } from './helpers.js';

const sent = [];
let ctx;
let server;
let base;

function make(config = {}) {
  sent.length = 0;
  return createApp({
    databasePath: ':memory:',
    llm: createMockLlm(),
    smsSender: { name: 'test', async send(msg) { sent.push(msg); } },
    config: {
      defaultUserId: 'demo-user', host: '127.0.0.1', port: 0, ollamaEnabled: false,
      llmProvider: 'mock', modelscopeApiKey: '', root: process.cwd(), ...config,
    },
  });
}

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function signIn(phone = '0712 345 678') {
  await call('/api/auth/request-code', { method: 'POST', body: { phone } });
  const code = /(\d{6})/.exec(sent.at(-1).text)[1];
  return call('/api/auth/verify', { method: 'POST', body: { phone, code } });
}

async function start(config) {
  ctx = make(config);
  server = await listen(ctx.app);
  base = server.url;
}

afterEach(async () => {
  if (server) await server.close();
  if (ctx) ctx.db.close();
  server = undefined;
  ctx = undefined;
});

describe('phone normalisation', () => {
  it('accepts Kenyan local and international forms', () => {
    for (const v of ['0712345678', '712 345 678', '+254712345678', '254712345678', '0712-345-678']) {
      expect(normalizePhone(v)).toBe('254712345678');
    }
    expect(normalizePhone('0112345678')).toBe('254112345678');
  });
  it('rejects junk', () => {
    for (const v of ['', 'abc', '123', '07123', null, '0712 345 678 x']) expect(normalizePhone(v)).toBeNull();
  });
});

describe('phone + SMS code sign-in', () => {
  beforeEach(async () => { await start({ authRequired: true }); });

  it('requires a session when AUTH_REQUIRED is on', async () => {
    expect((await call('/api/bootstrap?userId=demo-user')).status).toBe(401);
    expect((await call('/api/health')).body.auth.required).toBe(true);
  });

  it('signs in, scopes data to the phone account, and signs out', async () => {
    const { status, body } = await signIn();
    expect(status).toBe(200);
    expect(body.userId).toBe('p254712345678');
    expect(sent[0].to).toBe('254712345678');
    expect(body.demoCode).toBeUndefined();

    // client-supplied userId is ignored in favour of the session
    const boot = await call('/api/bootstrap?userId=someone-else', { token: body.token });
    expect(boot.status).toBe(200);
    const me = await call('/api/auth/me', { token: body.token });
    expect(me.body.userId).toBe('p254712345678');

    await call('/api/auth/logout', { method: 'POST', token: body.token });
    expect((await call('/api/auth/me', { token: body.token })).status).toBe(401);
  });

  it('keeps two phones separate', async () => {
    const a = (await signIn('0711111111')).body;
    const b = (await signIn('0722222222')).body;
    await call('/api/channels/web', { method: 'POST', token: a.token, body: { text: 'I sold two bags of maize for 3000.' } });
    const recA = await call('/api/records', { token: a.token });
    const recB = await call('/api/records', { token: b.token });
    expect(recA.body.records.length).toBe(1);
    expect(recB.body.records.length).toBe(0);
  });

  it('rejects wrong codes, then locks after 5 attempts', async () => {
    const phone = '0733333333';
    await call('/api/auth/request-code', { method: 'POST', body: { phone } });
    const real = /(\d{6})/.exec(sent.at(-1).text)[1];
    const wrong = real === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      expect((await call('/api/auth/verify', { method: 'POST', body: { phone, code: wrong } })).status).toBe(400);
    }
    const locked = await call('/api/auth/verify', { method: 'POST', body: { phone, code: real } });
    expect(locked.status).toBe(429);
  });

  it('limits code requests per phone', async () => {
    const phone = '0744444444';
    for (let i = 0; i < 3; i += 1) {
      expect((await call('/api/auth/request-code', { method: 'POST', body: { phone } })).status).toBe(200);
    }
    expect((await call('/api/auth/request-code', { method: 'POST', body: { phone } })).status).toBe(429);
  });

  it('a code only works once', async () => {
    const phone = '0755555555';
    await call('/api/auth/request-code', { method: 'POST', body: { phone } });
    const code = /(\d{6})/.exec(sent.at(-1).text)[1];
    expect((await call('/api/auth/verify', { method: 'POST', body: { phone, code } })).status).toBe(200);
    expect((await call('/api/auth/verify', { method: 'POST', body: { phone, code } })).status).toBe(400);
  });

  it('rejects an invalid phone number', async () => {
    expect((await call('/api/auth/request-code', { method: 'POST', body: { phone: 'nope' } })).status).toBe(400);
  });
});

describe('optional sign-in (demo mode)', () => {
  beforeEach(async () => { await start({ authRequired: false, authDemoCodes: true }); });

  it('still serves the demo user with no token, but never a phone account', async () => {
    expect((await call('/api/bootstrap?userId=demo-user')).status).toBe(200);
    expect((await call('/api/bootstrap?userId=p254712345678')).status).toBe(401);
  });

  it('returns the code in the response only when demo codes are on', async () => {
    const r = await call('/api/auth/request-code', { method: 'POST', body: { phone: '0712345678' } });
    expect(r.body.demoCode).toMatch(/^\d{6}$/);
  });
});
