import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createTestApp, listen } from './helpers.js';
import { detectHazard } from '../src/guidance/safety.js';
import { fallbackIntent } from '../src/guidance/intent.js';
import { seedAdvisories } from '../src/guidance/guidance.js';
import { openDatabase } from '../src/storage/db.js';
import { createRepo } from '../src/storage/repo.js';
import { DEMO_DATA_SOURCE, DEMO_LAST_UPDATED, SYNTHETIC_ADVISORIES } from '../src/guidance/advisories-data.js';
import { getPoultryGuide } from '../src/guidance/poultry-guide.js';

const SECTIONS = ['feeding', 'care', 'vaccination', 'accommodation', 'hygiene'];

async function post(server, path, body) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('poultry life-stage guide', () => {
  it('covers hatching, brooding, growers and adults, each with all five sections', () => {
    const guide = getPoultryGuide();
    expect(guide.stages.map((stage) => stage.id)).toEqual(['hatching', 'brooding', 'growers', 'adults']);
    for (const stage of guide.stages) {
      for (const key of SECTIONS) {
        expect(stage.sections[key]?.length, `${stage.id}.${key}`).toBeGreaterThan(0);
      }
      expect(stage.watch_for.length).toBeGreaterThan(0);
    }
    expect(guide.vaccinationSchedule.length).toBeGreaterThan(4);
    expect(guide.disclaimer).toMatch(/veterinary officer|animal health provider/i);
  });

  it('has a static copy in public/ that matches the source (run npm run build:poultry)', () => {
    const file = new URL('../public/poultry-guide.json', import.meta.url);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(getPoultryGuide());
  });

  it('is served by the API', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const response = await fetch(`${server.url}/api/poultry`);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.stages).toHaveLength(4);
    } finally {
      await server.close();
    }
  });
});

describe('poultry guidance search', () => {
  it('maps chicken wording, in English and Kiswahili, to poultry', () => {
    expect(fallbackIntent('My chicks are huddling under the lamp').crop).toBe('poultry');
    expect(fallbackIntent('Kuku wangu wanaharisha damu').crop).toBe('poultry');
    expect(fallbackIntent('Egg drop in my layers').crop).toBe('poultry');
    expect(fallbackIntent('Maize leaf yellowing in Kiambu').crop).toBe('maize');
  });

  it('returns poultry advisories and ranks the right one first', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const brooding = await post(server, '/api/guidance/search', { userId: 'demo-user', text: 'My chicks are huddling under the lamp' });
      expect(brooding.body.kind).toBe('results');
      expect(brooding.body.advisories[0].id).toBe('adv-poultry-brooding');

      const blood = await post(server, '/api/guidance/search', { userId: 'demo-user', text: 'bloody droppings in my broilers' });
      expect(blood.body.advisories[0].id).toBe('adv-poultry-coccidiosis');
    } finally {
      await server.close();
    }
  });

  it('flags a flock die-off as a hazard, but not routine questions', () => {
    expect(detectHazard('Many chickens died suddenly overnight').isHazard).toBe(true);
    expect(detectHazard('Kuku wangu wanakufa wengi').isHazard).toBe(true);
    expect(detectHazard('Chicks huddling under the lamp').isHazard).toBe(false);
    expect(detectHazard('My old hen died last month').isHazard).toBe(false);
  });
});

describe('advisory seeding', () => {
  it('adds new advisories to a database that was seeded earlier', () => {
    const db = openDatabase(':memory:');
    const repo = createRepo(db);
    // An older install that only ever had one advisory.
    repo.upsertAdvisory({ ...SYNTHETIC_ADVISORIES[0], last_updated: DEMO_LAST_UPDATED, data_source: DEMO_DATA_SOURCE });
    expect(repo.countAdvisories()).toBe(1);

    const result = seedAdvisories(repo);
    expect(result.seeded).toBe(false);
    expect(repo.countAdvisories()).toBe(SYNTHETIC_ADVISORIES.length);
    expect(repo.getAdvisory('adv-poultry-brooding')).toBeTruthy();
  });
});
