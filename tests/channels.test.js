import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers.js';

let ctx;

beforeEach(() => {
  ctx = createTestApp();
});

afterEach(() => {
  ctx.db.close();
});

describe('channels share one agent', () => {
  it('records from SMS and reads the same sale from web and USSD', async () => {
    const sms = await ctx.channels.sms.handleTurn('buyer', 'I sold three bags of maize for 4500.');
    expect(sms.response.text).toContain('Recorded: maize sale');
    expect(sms.response.text).toContain('KSh 4,500');
    expect(sms.segments).toBe(1);
    expect(ctx.channels.sms.inbound.channel).toBe('sms');
    expect(ctx.channels.sms.outbound.text).toBe(sms.response.text);

    const web = await ctx.channels.web.handleTurn('buyer', 'How much did I sell today?');
    expect(web.response.text).toBe("Today's recorded sales are KSh 4,500.");
    expect(ctx.channels.web.inbound.channel).toBe('web');

    const menu = await ctx.channels.ussd.handleTurn('buyer', '');
    expect(menu.display).toBe('FIKAAI AGRO ADVISORY\n\n1. Crop or animal problem\n2. Record a sale\n3. View sales\n4. Help\n\nSelect:');

    const view = await ctx.channels.ussd.handleTurn('buyer', '3');
    expect(view.response.text).toContain('maize');
    expect(view.response.text).toContain('KSh 4,500');
    expect(view.display).toContain('0. Back');
    expect(ctx.channels.ussd.inbound.text).toBe('Show what I recorded today.');
  });

  it('walks the USSD record menu and rejects unknown choices', async () => {
    const prompt = await ctx.channels.ussd.handleTurn('buyer', '2');
    expect(prompt.display).toContain('MAIZE 4500');
    const saved = await ctx.channels.ussd.handleTurn('buyer', 'MAIZE 4500');
    expect(saved.response.text).toContain('Recorded: maize sale');
    const invalid = await ctx.channels.ussd.handleTurn('buyer', '9');
    expect(invalid.display).toContain('Invalid choice.');
    expect(invalid.display).toContain('1. Crop or animal problem');
  });

  it('switches the USSD menu to Kiswahili with the stored language', async () => {
    await ctx.channels.web.handleTurn('buyer', 'kiswahili');
    const menu = await ctx.channels.ussd.handleTurn('buyer', '');
    expect(menu.display).toContain('1. Tatizo la zao au mnyama');
    expect(menu.display).toContain('Chagua:');
  });

  it('counts SMS segments for a long reply', async () => {
    const help = await ctx.channels.sms.handleTurn('buyer', 'help');
    expect(help.segments).toBe(Math.max(1, Math.ceil(help.display.length / 160)));
    expect(help.segments).toBeGreaterThan(1);
  });

  it('answers a crop problem over SMS from the on-device library', async () => {
    const sms = await ctx.channels.sms.handleTurn('farmer', 'Maize leaf yellowing in Kiambu');
    expect(sms.response.intent).toBe('crop_guidance');
    expect(sms.response.tier).toBe('rules');
    expect(sms.response.text).toContain('nitrogen');
    expect(sms.response.text).toContain('Confirm with your extension officer');
    expect(ctx.repo.listRecords('farmer')).toHaveLength(0);
  });

  it('answers a crop problem in Kiswahili', async () => {
    const sms = await ctx.channels.sms.handleTurn('mkulima', 'Mahindi yangu yana wadudu Kiambu');
    expect(sms.response.intent).toBe('crop_guidance');
    expect(sms.response.text).toContain('Huenda ni');
  });

  it('keeps sale records out of the guidance path', async () => {
    const sms = await ctx.channels.sms.handleTurn('farmer', 'MAIZE 4500');
    expect(sms.response.intent).toBe('record_sale');
  });

  it('puts poisoning language ahead of any guidance', async () => {
    const sms = await ctx.channels.sms.handleTurn('farmer', 'My child drank pesticide');
    expect(sms.response.intent).toBe('crop_guidance');
    expect(sms.response.text).toMatch(/poisoning emergency/i);
  });

  it('asks for the crop when the question has none', async () => {
    const sms = await ctx.channels.sms.handleTurn('farmer', 'My crop problem is getting worse');
    expect(sms.response.text).toContain('Which crop or animal');
  });

  it('opens the USSD menu and options from dial-string shortcuts', async () => {
    const menu = await ctx.channels.ussd.handleTurn('farmer', '*384*40#');
    expect(menu.display).toContain('FIKAAI AGRO ADVISORY');
    const ask = await ctx.channels.ussd.handleTurn('farmer', '*384*40*1#');
    expect(ask.display).toContain('Describe the crop or animal problem');
    const answer = await ctx.channels.ussd.handleTurn('farmer', 'Tomato blight in Kiambu');
    expect(answer.response.text).toContain('tomato blight');
  });
});
