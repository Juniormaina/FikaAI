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
    expect(menu.display).toBe('FIKAAI AGRO ADVISORY\n\n1. Crop or animal problem\n2. Record a sale\n3. View sales\n4. Help\n5. Poultry guide\n\nSelect:');

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

  it('walks the poultry guide over USSD: stage, topic, back', async () => {
    const stages = await ctx.channels.ussd.handleTurn('farmer', '*384*40*5#');
    expect(stages.display).toContain('POULTRY GUIDE');
    expect(stages.display).toContain('2. Brooding chicks');

    const topics = await ctx.channels.ussd.handleTurn('farmer', '2');
    expect(topics.display).toContain('Brooding chicks');
    expect(topics.display).toContain('2. Care');

    const care = await ctx.channels.ussd.handleTurn('farmer', '2');
    expect(care.display).toContain('32-35C in week 1');

    const backToTopics = await ctx.channels.ussd.handleTurn('farmer', '0');
    expect(backToTopics.display).toContain('Select topic:');
    const backToStages = await ctx.channels.ussd.handleTurn('farmer', '0');
    expect(backToStages.display).toContain('Select stage:');
    const backToMenu = await ctx.channels.ussd.handleTurn('farmer', '0');
    expect(backToMenu.display).toContain('FIKAAI AGRO ADVISORY');
  });

  it('rejects invalid poultry choices and keeps the user in place', async () => {
    await ctx.channels.ussd.handleTurn('farmer', '5');
    const bad = await ctx.channels.ussd.handleTurn('farmer', '9');
    expect(bad.display).toContain('Select stage:');
    expect(bad.display).toContain('POULTRY GUIDE');
  });

  it('keeps every poultry USSD screen within 182 characters in both languages', async () => {
    const { POULTRY_USSD_TEXT, POULTRY_USSD_STAGES, POULTRY_USSD_TOPICS } = await import('../src/guidance/poultry-ussd.js');
    for (const lang of ['en', 'sw']) {
      for (const stage of POULTRY_USSD_STAGES) {
        for (const topic of POULTRY_USSD_TOPICS) {
          const screen = `${POULTRY_USSD_TEXT[lang][stage][topic]}\n0. Back`;
          expect(screen.length, `${lang}/${stage}/${topic}`).toBeLessThanOrEqual(182);
        }
      }
    }
  });
});
