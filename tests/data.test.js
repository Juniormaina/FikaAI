import { afterEach, beforeEach, expect, it } from 'vitest';
import { todayInNairobi } from '../src/i18n/format.js';
import { createUserMessage } from '../src/channels/message.js';
import { createTestApp } from './helpers.js';

let ctx;

beforeEach(() => {
  ctx = createTestApp();
});

afterEach(() => {
  ctx.db.close();
});

it('creates, retrieves, updates, and deletes a local record', async () => {
  const created = ctx.repo.createRecord({
    userId: 'shop',
    item: 'beans',
    quantity: 2,
    unit: 'kg',
    amountKes: 800,
    recordedOn: todayInNairobi(),
  });
  expect(ctx.repo.getRecord(created.id, 'shop')).toMatchObject({ item: 'beans', amountKes: 800 });
  const updated = ctx.repo.updateRecord(created.id, 'shop', { amountKes: 900 });
  expect(updated.amountKes).toBe(900);
  expect(ctx.repo.listRecords('shop', { item: 'beans' })).toHaveLength(1);
  expect(ctx.repo.deleteRecord(created.id, 'shop')).toBe(true);
  expect(ctx.repo.getRecord(created.id, 'shop')).toBeNull();
});

it('clears demo data without removing the user', async () => {
  await ctx.agent.handle(createUserMessage('shop', 'web', 'MAIZE 4500'));
  ctx.repo.clearUserData('shop');
  expect(ctx.repo.listRecords('shop')).toHaveLength(0);
  expect(ctx.repo.listMessages('shop')).toHaveLength(0);
  expect(ctx.repo.getUser('shop')).toBeTruthy();
});
