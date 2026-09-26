import { describe, expect, it } from 'vitest';
import { createTestApp, listen } from './helpers.js';
import { detectEmergency } from '../src/healthcare/safety.js';
import {
  fallbackIntent,
  parseIntentJson,
  validateIntent,
  extractHealthcareIntent,
} from '../src/healthcare/intent.js';
import { createMockLlm } from '../src/llm/provider.js';

describe('healthcare safety', () => {
  it('flags urgent language without diagnosing', () => {
    const result = detectEmergency('I have severe chest pain and difficulty breathing');
    expect(result.isEmergency).toBe(true);
    expect(result.message).toMatch(/urgent medical attention/i);
    expect(result.message).not.toMatch(/you have/i);
  });

  it('does not flag routine specialist requests', () => {
    expect(detectEmergency('I need a cardiologist in Nairobi.').isEmergency).toBe(false);
  });
});

describe('healthcare intent', () => {
  it('extracts cardiology in Nairobi via fallback', () => {
    const intent = fallbackIntent('I need a cardiologist in Nairobi.');
    expect(intent.specialty).toBe('cardiology');
    expect(intent.location).toBe('Nairobi');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });

  it('validates structured AI output', () => {
    const parsed = validateIntent({
      specialty: 'cardiology',
      location: 'Nairobi',
      request_type: 'specialist_consultation',
      urgency: 'routine',
      confidence: 0.92,
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.intent.specialty).toBe('cardiology');
  });

  it('rejects malformed AI JSON safely', () => {
    expect(parseIntentJson('not json').ok).toBe(false);
    expect(parseIntentJson('{"specialty":').ok).toBe(false);
  });

  it('uses fallback when LLM is unavailable', async () => {
    const result = await extractHealthcareIntent('I need a cardiologist in Nairobi.', {
      llm: {
        async generate() {
          throw new Error('AI down');
        },
      },
    });
    expect(result.emergency).toBe(false);
    expect(result.intent.specialty).toBe('cardiology');
    expect(result.source).toMatch(/fallback/);
  });

  it('uses fallback when mock LLM returns non-intent text', async () => {
    const result = await extractHealthcareIntent('Looking for pediatrics care in Nairobi', {
      llm: createMockLlm(),
    });
    expect(result.intent.specialty).toBe('pediatrics');
    expect(result.intent.location).toBe('Nairobi');
  });
});

describe('care API journey', () => {
  it('runs search → facility → journey → pending → sync → feedback', async () => {
    const { app, repo } = createTestApp();
    expect(repo.countProviders()).toBeGreaterThan(0);

    const server = await listen(app);
    try {
      const search = await fetch(`${server.url}/api/care/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user', text: 'I need a cardiologist in Nairobi.' }),
      }).then((r) => r.json());

      expect(search.kind).toBe('results');
      expect(search.intent.specialty).toBe('cardiology');
      expect(search.providers.length).toBeGreaterThan(0);
      expect(search.providers[0].isDemoData).toBe(true);

      const providerId = search.providers[0].id;
      const detail = await fetch(`${server.url}/api/care/providers/${providerId}`).then((r) => r.json());
      expect(detail.provider.facilityName).toBeTruthy();
      expect(detail.provider.dataSource).toMatch(/Synthetic|demonstration/i);

      const created = await fetch(`${server.url}/api/care/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          providerId,
          intent: search.intent,
          queryText: 'I need a cardiologist in Nairobi.',
        }),
      }).then(async (r) => ({ status: r.status, body: await r.json() }));

      expect(created.status).toBe(201);
      expect(created.body.journey.syncStatus).toBe('synced');
      const journeyId = created.body.journey.id;

      const queued = await fetch(`${server.url}/api/care/journeys/${journeyId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          actionType: 'offline_note',
          payload: { text: 'Reviewed requirements offline' },
        }),
      }).then((r) => r.json());

      expect(queued.journey.syncStatus).toBe('pending');

      const synced = await fetch(`${server.url}/api/care/journeys/${journeyId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' }),
      }).then((r) => r.json());

      expect(synced.journey.syncStatus).toBe('synced');
      expect(synced.syncedActions).toBe(1);

      const feedback = await fetch(`${server.url}/api/care/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          journeyId,
          rating: 'yes',
          comment: 'Clear demo',
        }),
      }).then(async (r) => ({ status: r.status, body: await r.json() }));

      expect(feedback.status).toBe(201);
      expect(feedback.body.feedback.rating).toBe('yes');
      expect(repo.listFeedback('demo-user')[0].rating).toBe('yes');
    } finally {
      await server.close();
    }
  });

  it('returns emergency response for urgent language', async () => {
    const { app } = createTestApp();
    const server = await listen(app);
    try {
      const result = await fetch(`${server.url}/api/care/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          text: 'I have severe chest pain and difficulty breathing',
        }),
      }).then((r) => r.json());
      expect(result.kind).toBe('emergency');
      expect(result.providers).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it('still searches when demo backend is offline via fallback', async () => {
    const { app } = createTestApp({ connectivityMode: 'offline' });
    const server = await listen(app);
    try {
      const result = await fetch(`${server.url}/api/care/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user', text: 'I need a cardiologist in Nairobi.' }),
      }).then((r) => r.json());
      expect(result.kind).toBe('results');
      expect(result.offline).toBe(true);
      expect(result.providers.length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });
});
