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
    expect(menu.display).toBe('FIKAAI\n\n1. Ask AI\n2. Record information\n3. View information\n4. Help\n\nSelect:');

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
    expect(invalid.display).toContain('1. Ask AI');
  });

  it('switches the USSD menu to Kiswahili with the stored language', async () => {
    await ctx.channels.web.handleTurn('buyer', 'kiswahili');
    const menu = await ctx.channels.ussd.handleTurn('buyer', '');
    expect(menu.display).toContain('1. Uliza AI');
    expect(menu.display).toContain('Chagua:');
  });

  it('counts SMS segments for a long reply', async () => {
    const help = await ctx.channels.sms.handleTurn('buyer', 'help');
    expect(help.segments).toBe(Math.max(1, Math.ceil(help.display.length / 160)));
    expect(help.segments).toBeGreaterThan(1);
  });
});
