import { afterEach, expect, it } from 'vitest';
import { createTestApp, listen } from './helpers.js';

let ctx;
let server;

afterEach(async () => {
  if (server) await server.close();
  ctx?.db.close();
  server = undefined;
  ctx = undefined;
});

async function post(path, body) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

it('runs SMS, USSD, and web through the gateway', async () => {
  ctx = createTestApp();
  server = await listen(ctx.app);

  const health = await fetch(`${server.url}/api/health`);
  expect(health.status).toBe(200);

  const sms = await post('/api/channels/sms', {
    userId: 'shop',
    text: 'I sold three bags of maize for 4500.',
  });
  expect(sms.status).toBe(200);
  expect(sms.data.response.text).toContain('KSh 4,500');

  const ussd = await post('/api/channels/ussd', { userId: 'shop', input: '3' });
  expect(ussd.data.response.text).toContain('maize');
  expect(ussd.data.response.text).toContain('KSh 4,500');

  const web = await post('/api/channels/web', {
    userId: 'shop',
    text: 'Explain what I recorded today.',
  });
  expect(web.data.response.tier).toBe('qwen');
  expect(web.data.response.text).toContain('maize');

  const empty = await post('/api/channels/web', { userId: 'shop', text: '   ' });
  expect(empty.status).toBe(400);

  const records = await fetch(`${server.url}/api/records?userId=shop`);
  const listed = await records.json();
  const record = listed.records[0];
  const patched = await fetch(`${server.url}/api/records/${record.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'shop', amountKes: 4800 }),
  });
  expect(patched.status).toBe(200);
  const saved = await patched.json();
  expect(saved.record.amountKes).toBe(4800);
});

it('queues over HTTP and syncs when the demo connection returns', async () => {
  ctx = createTestApp({ connectivityMode: 'offline' });
  server = await listen(ctx.app);

  const queued = await post('/api/channels/web', {
    userId: 'shop',
    text: 'What is the market price of maize?',
  });
  expect(queued.data.response.requiresSync).toBe(true);

  const local = await post('/api/channels/sms', {
    userId: 'shop',
    text: 'MAIZE 4500',
  });
  expect(local.data.response.text).toContain('Recorded: maize sale');

  const online = await post('/api/connectivity', { mode: 'online' });
  expect(online.data.mode).toBe('online');
  expect(online.data.sync.processed).toHaveLength(1);
  expect(online.data.sync.processed[0].response).toContain('Simulated reference');
});
