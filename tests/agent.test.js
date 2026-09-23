import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseSale } from '../src/agent/sales.js';
import { createUserMessage } from '../src/channels/message.js';
import { createTestApp } from './helpers.js';

let ctx;

beforeEach(() => {
  ctx = createTestApp();
});

afterEach(() => {
  ctx.db.close();
});

describe('sales parsing', () => {
  it('reads a short sale, a narrative sale, and a Kiswahili sale', () => {
    expect(parseSale('MAIZE 4500')).toEqual({
      item: 'maize',
      quantity: null,
      unit: null,
      amountKes: 4500,
    });
    expect(parseSale('I sold three bags of maize for 4500')).toEqual({
      item: 'maize',
      quantity: 3,
      unit: 'bags',
      amountKes: 4500,
    });
    expect(parseSale('I sold maize for KSh 4,500')).toMatchObject({ item: 'maize', amountKes: 4500 });
    expect(parseSale('Nimeuza mahindi 3 mifuko kwa 4500')).toEqual({
      item: 'maize',
      quantity: 3,
      unit: 'bags',
      amountKes: 4500,
    });
    expect(parseSale('I sold two crates of mangoes for 800')).toEqual({
      item: 'mangoes',
      quantity: 2,
      unit: 'crates',
      amountKes: 800,
    });
  });
});

describe('agent routing and tools', () => {
  it('records a short sale with deterministic rules', async () => {
    const response = await ctx.agent.handle(createUserMessage('shop', 'web', 'MAIZE 4500'));
    expect(response.tier).toBe('rules');
    expect(response.intent).toBe('record_sale');
    expect(response.text).toBe('Recorded: maize sale\nAmount: KSh 4,500');
    expect(response.actions.some((action) => action.name === 'local_database')).toBe(true);
    expect(ctx.repo.listRecords('shop')).toHaveLength(1);
  });

  it('records a sentence and totals it', async () => {
    await ctx.agent.handle(createUserMessage('shop', 'web', 'I sold three bags of maize for 4500.'));
    const total = await ctx.agent.handle(createUserMessage('shop', 'sms', 'How much did I sell today?'));
    expect(total.tier).toBe('rules');
    expect(total.text).toBe("Today's recorded sales are KSh 4,500.");
  });

  it('answers the same words on web and SMS', async () => {
    const web = await ctx.agent.handle(createUserMessage('shop', 'web', 'MAIZE 4500'));
    const sms = await ctx.agent.handle(createUserMessage('shop', 'sms', 'MAIZE 4500'));
    expect(web.text).toBe(sms.text);
  });

  it('records Kiswahili', async () => {
    const response = await ctx.agent.handle(createUserMessage('shop', 'sms', 'Nimeuza mahindi 3 mifuko kwa 4500'));
    expect(response.text).toBe('Imehifadhiwa: mauzo ya mahindi\nIdadi: 3 mifuko\nKiasi: KSh 4,500');
    const total = await ctx.agent.handle(createUserMessage('shop', 'sms', 'Nimeuza ngapi leo?'));
    expect(total.text).toBe('Mauzo yaliyorekodiwa leo ni KSh 4,500.');
  });

  it('uses the local classifier for mixed how-to questions', async () => {
    const response = await ctx.agent.handle(createUserMessage('shop', 'web', 'Nataka kujua how I can record my sale.'));
    expect(response.tier).toBe('local');
    expect(response.intent).toBe('help_record');
    expect(response.text).toContain('MAIZE 4500');
    expect(response.text).toContain('MAHINDI 4500');
    expect(ctx.repo.listRecords('shop')).toHaveLength(0);
  });

  it('escalates an explanation to the local model provider', async () => {
    await ctx.agent.handle(createUserMessage('shop', 'web', 'I sold three bags of maize for 4500.'));
    const response = await ctx.agent.handle(createUserMessage('shop', 'web', 'Explain what I recorded today.'));
    expect(response.tier).toBe('qwen');
    expect(response.provider).toBe('mock');
    expect(response.text).toContain('maize');
    expect(response.text).toContain('3 bags');
    expect(response.text).toContain('KSh 4,500');
    expect(response.actions.some((action) => action.name === 'qwen')).toBe(true);
  });

  it('answers help from rules and arithmetic from the calculator', async () => {
    const help = await ctx.agent.handle(createUserMessage('shop', 'web', 'help'));
    expect(help.intent).toBe('help');
    expect(help.tier).toBe('rules');
    expect(help.text).toContain('MAIZE 4500');

    const math = await ctx.agent.handle(createUserMessage('shop', 'web', 'what is 4500 / 3'));
    expect(math.text).toBe('Result: 1500');
    expect(math.actions.some((action) => action.name === 'calculator')).toBe(true);

    const nested = await ctx.agent.handle(createUserMessage('shop', 'web', '(100+50)*2'));
    expect(nested.text).toBe('Result: 300');

    const unsafe = await ctx.agent.handle(createUserMessage('shop', 'web', 'what is 1; process.exit(0)'));
    expect(unsafe.text.startsWith('Result:')).toBe(false);
  });

  it('updates and deletes a saved sale', async () => {
    await ctx.agent.handle(createUserMessage('shop', 'web', 'MAIZE 4500'));
    const updated = await ctx.agent.handle(createUserMessage('shop', 'web', 'change the maize sale to 5000'));
    expect(updated.text).toBe('Updated maize to KSh 5,000.');
    const total = await ctx.agent.handle(createUserMessage('shop', 'web', 'How much did I sell today?'));
    expect(total.text).toBe("Today's recorded sales are KSh 5,000.");
    const removed = await ctx.agent.handle(createUserMessage('shop', 'web', 'delete last maize record'));
    expect(removed.text).toBe('Deleted the last maize sale.');
    expect(ctx.repo.listRecords('shop')).toHaveLength(0);
  });

  it('answers simulated market prices when online', async () => {
    const response = await ctx.agent.handle(createUserMessage('shop', 'web', 'What is the market price of maize?'));
    expect(response.requiresSync).toBe(false);
    expect(response.text).toContain('Simulated reference, not a live price');
    expect(response.text).toContain('KSh 45 per kg');
    expect(response.actions.some((action) => action.name === 'knowledge')).toBe(true);
  });

  it('sets the stored language', async () => {
    const response = await ctx.agent.handle(createUserMessage('shop', 'web', 'kiswahili'));
    expect(response.text).toBe('Lugha imewekwa kuwa Kiswahili.');
    expect(ctx.repo.getUser('shop').language).toBe('sw');
  });
});
