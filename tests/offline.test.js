import { afterEach, beforeEach, expect, it } from 'vitest';
import { createUserMessage } from '../src/channels/message.js';
import { syncQueue } from '../src/offline/sync.js';
import { createTestApp } from './helpers.js';

let ctx;

beforeEach(() => {
  ctx = createTestApp({ connectivityMode: 'offline' });
});

afterEach(() => {
  ctx.db.close();
});

it('keeps local sales working while the demo connection is offline', async () => {
  const response = await ctx.gateway.handle(createUserMessage('shop', 'web', 'I sold maize for 4500'));
  expect(response.requiresSync).toBe(false);
  expect(response.text).toContain('Recorded: maize sale');
  expect(ctx.repo.listRecords('shop')).toHaveLength(1);
});

it('queues external requests and delivers them after reconnecting', async () => {
  const queued = await ctx.gateway.handle(createUserMessage('shop', 'sms', 'What is the market price of maize?'));
  expect(queued.requiresSync).toBe(true);
  expect(queued.text).toContain('Offline: I saved this request');
  const pending = ctx.repo.listQueue('shop');
  expect(pending).toHaveLength(1);
  expect(pending[0].status).toBe('pending');

  const explained = await ctx.agent.handle(createUserMessage('shop', 'web', 'Explain what I recorded today.'));
  expect(explained.requiresSync).toBe(false);
  expect(explained.tier).toBe('qwen');
  expect(ctx.repo.listPendingQueue()).toHaveLength(1);

  const skipped = await syncQueue(ctx);
  expect(skipped.skipped).toBe(true);
  expect(ctx.repo.listPendingQueue()).toHaveLength(1);

  await ctx.connectivity.setMode('online');
  const synced = await syncQueue(ctx);
  expect(synced.skipped).toBe(false);
  expect(synced.processed).toHaveLength(1);
  expect(synced.processed[0].response).toContain('Simulated reference');
  expect(synced.processed[0].response).toContain('KSh 45');
  expect(ctx.repo.listQueue('shop')[0].status).toBe('completed');

  const again = await syncQueue(ctx);
  expect(again.processed).toHaveLength(0);
});
