import { describe, expect, it } from 'vitest';
import { createTestApp, listen } from './helpers.js';
import { detectHazard } from '../src/guidance/safety.js';
import {
  extractGuidanceIntent,
  fallbackIntent,
  isGuidanceQuestion,
  parseIntentJson,
  validateIntent,
} from '../src/guidance/intent.js';
import { createMockLlm } from '../src/llm/provider.js';

async function post(server, path, body) {
  const response = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('field hazard safety', () => {
  it('flags poisoning language without diagnosing', () => {
    const result = detectHazard('My brother drank pesticide by mistake');
    expect(result.isHazard).toBe(true);
    expect(result.kind).toBe('people');
    expect(result.message).toMatch(/medical help/i);
    expect(result.message).toMatch(/cannot diagnose/i);
  });

  it('flags sudden animal deaths as a veterinary matter', () => {
    const result = detectHazard('Sudden death in my cattle, three cows overnight');
    expect(result.isHazard).toBe(true);
    expect(result.kind).toBe('animal');
    expect(result.message).toMatch(/veterinary officer/i);
  });

  it('does not flag routine crop questions', () => {
    expect(detectHazard('Maize leaf yellowing in Kiambu').isHazard).toBe(false);
  });
});

describe('guidance intent', () => {
  it('extracts maize in Kiambu via fallback', () => {
    const intent = fallbackIntent('Maize leaf yellowing in Kiambu');
    expect(intent.crop).toBe('maize');
    expect(intent.region).toBe('Kiambu');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });

  it('maps Rift Valley wording and pest topics', () => {
    const intent = fallbackIntent('Maize pests Rift Valley');
    expect(intent.crop).toBe('maize');
    expect(intent.region).toBe('Nakuru');
    expect(intent.topic).toBe('pest');
  });

  it('infers maize from fall armyworm', () => {
    const intent = fallbackIntent('I think I have fall armyworm');
    expect(intent.crop).toBe('maize');
    expect(intent.topic).toBe('pest');
  });

  it('validates structured AI output', () => {
    const parsed = validateIntent({
      crop: 'maize',
      region: 'Kiambu',
      topic: 'nutrient',
      urgency: 'routine',
      confidence: 0.9,
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.intent.crop).toBe('maize');
    expect(parsed.intent.topic).toBe('nutrient');
  });

  it('rejects malformed AI JSON safely', () => {
    expect(parseIntentJson('not json').ok).toBe(false);
    expect(parseIntentJson('{"crop":').ok).toBe(false);
  });

  it('uses fallback when the LLM is unavailable', async () => {
    const result = await extractGuidanceIntent('Maize leaf yellowing in Kiambu', {
      llm: {
        async generate() {
          throw new Error('AI down');
        },
      },
    });
    expect(result.hazard).toBe(false);
    expect(result.intent.crop).toBe('maize');
    expect(result.source).toMatch(/fallback/);
  });

  it('uses fallback when the mock LLM returns non-intent text', async () => {
    const result = await extractGuidanceIntent('Tomato blight stages in Kiambu', {
      llm: createMockLlm(),
    });
    expect(result.intent.crop).toBe('tomatoes');
    expect(result.intent.topic).toBe('disease');
  });

  it('asks which crop when none is given', async () => {
    const result = await extractGuidanceIntent('My leaves look sick', { llm: null });
    expect(result.needsClarification).toBe(true);
    expect(result.clarification).toMatch(/Which crop or animal/);
  });

  it('separates guidance questions from sale records', () => {
    expect(isGuidanceQuestion('Maize leaf yellowing in Kiambu')).toBe(true);
    expect(isGuidanceQuestion('Dairy cattle feed in a dry spell')).toBe(true);
    expect(isGuidanceQuestion('MAIZE 4500')).toBe(false);
    expect(isGuidanceQuestion('I sold three bags of maize for 4500.')).toBe(false);
    expect(isGuidanceQuestion('How much maize did I sell today?')).toBe(false);
  });
});

describe('guidance API plan flow', () => {
  it('runs search → advisory → plan → pending → sync → feedback', async () => {
    const { app, repo } = createTestApp();
    expect(repo.countAdvisories()).toBeGreaterThan(0);

    const server = await listen(app);
    try {
      const search = (await post(server, '/api/guidance/search', {
        userId: 'demo-user',
        text: 'Maize leaf yellowing in Kiambu',
      })).body;

      expect(search.kind).toBe('results');
      expect(search.intent.crop).toBe('maize');
      expect(search.advisories.length).toBeGreaterThan(1);
      expect(search.advisories.length).toBeLessThanOrEqual(4);
      expect(search.advisories[0].isDemoData).toBe(true);
      expect(search.advisories[0].crops).toContain('maize');
      // Ranked by keyword score, best first.
      const scores = search.advisories.map((item) => item.matchPercent);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
      expect(search.advisories[0].id).toBe('adv-maize-nitrogen');

      const advisoryId = search.advisories[0].id;
      const detail = await fetch(`${server.url}/api/guidance/advisories/${advisoryId}`).then((r) => r.json());
      expect(detail.advisory.title).toBeTruthy();
      expect(detail.advisory.steps.length).toBeGreaterThan(1);
      expect(detail.advisory.dataSource).toMatch(/Synthetic|demonstration/i);

      const created = await post(server, '/api/guidance/plans', {
        userId: 'demo-user',
        advisoryId,
        intent: search.intent,
        queryText: 'Maize leaf yellowing in Kiambu',
      });
      expect(created.status).toBe(201);
      expect(created.body.plan.syncStatus).toBe('synced');
      expect(created.body.plan.advisorySnapshot.id).toBe(advisoryId);
      const planId = created.body.plan.id;

      const queued = (await post(server, `/api/guidance/plans/${planId}/actions`, {
        userId: 'demo-user',
        actionType: 'step_done',
        payload: { stepIndex: 0 },
      })).body;
      expect(queued.plan.syncStatus).toBe('pending');
      expect(queued.action.actionType).toBe('step_done');

      const synced = (await post(server, `/api/guidance/plans/${planId}/sync`, {
        userId: 'demo-user',
      })).body;
      expect(synced.plan.syncStatus).toBe('synced');
      expect(synced.syncedActions).toBe(1);

      const latest = await fetch(`${server.url}/api/guidance/plans/latest?userId=demo-user`).then((r) => r.json());
      expect(latest.plan.id).toBe(planId);
      expect(latest.actions).toHaveLength(1);

      const feedback = await post(server, '/api/guidance/feedback', {
        userId: 'demo-user',
        planId,
        rating: 'yes',
        comment: 'Clear demo',
      });
      expect(feedback.status).toBe(201);
      expect(repo.listFeedback('demo-user')[0].rating).toBe('yes');
    } finally {
      await server.close();
    }
  });

  it('rejects unknown advisories and invalid ratings', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const missing = await post(server, '/api/guidance/plans', { userId: 'demo-user', advisoryId: 'nope' });
      expect(missing.status).toBe(404);
      const bad = await post(server, '/api/guidance/feedback', { userId: 'demo-user', rating: 'maybe' });
      expect(bad.status).toBe(400);
    } finally {
      await server.close();
    }
  });

  it('returns a hazard response for poisoning language', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const { body } = await post(server, '/api/guidance/search', {
        userId: 'demo-user',
        text: 'My brother drank pesticide by mistake',
      });
      expect(body.kind).toBe('hazard');
      expect(body.advisories).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it('asks a clarifying question when the crop is missing', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const { body } = await post(server, '/api/guidance/search', {
        userId: 'demo-user',
        text: 'Something is wrong in Kiambu',
      });
      expect(body.kind).toBe('clarify');
    } finally {
      await server.close();
    }
  });

  it('still searches when the demo backend is offline via fallback', async () => {
    const { app } = createTestApp({ connectivityMode: 'offline' });
    const server = await listen(app);
    try {
      const { body } = await post(server, '/api/guidance/search', {
        userId: 'demo-user',
        text: 'Maize leaf yellowing in Kiambu',
      });
      expect(body.kind).toBe('results');
      expect(body.offline).toBe(true);
      expect(body.advisories.length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it('refuses to sync a plan while the backend is offline', async () => {
    const { app, repo } = createTestApp({ connectivityMode: 'offline' });
    const server = await listen(app);
    try {
      const plan = repo.createPlan({
        userId: 'demo-user',
        advisoryId: 'adv-maize-nitrogen',
        status: 'PLAN_SAVED',
        syncStatus: 'pending',
        advisorySnapshot: { id: 'adv-maize-nitrogen' },
      });
      const result = await post(server, `/api/guidance/plans/${plan.id}/sync`, { userId: 'demo-user' });
      expect(result.status).toBe(409);
    } finally {
      await server.close();
    }
  });
});
