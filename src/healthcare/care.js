import {
  DEMO_DATA_SOURCE,
  DEMO_LAST_UPDATED,
  SYNTHETIC_PROVIDERS,
  toProviderRow,
} from './providers-data.js';
import { extractHealthcareIntent } from './intent.js';

export function seedProviders(repo) {
  const existing = repo.countProviders();
  if (existing > 0) {
    return { seeded: false, count: existing };
  }
  for (const provider of SYNTHETIC_PROVIDERS) {
    repo.upsertProvider({
      ...provider,
      last_updated: DEMO_LAST_UPDATED,
      data_source: DEMO_DATA_SOURCE,
      is_demo_data: true,
    });
  }
  return { seeded: true, count: SYNTHETIC_PROVIDERS.length };
}

export function searchProviders(repo, intent = {}) {
  const specialty = intent.specialty || null;
  const location = intent.location || null;
  const rows = repo.searchProviders({ specialty, location });
  return rows.map(toProviderRow);
}

export async function runCareSearch({ repo, llm, text, userId }) {
  const extraction = await extractHealthcareIntent(text, { llm });

  if (extraction.emergency) {
    return {
      kind: 'emergency',
      message: extraction.message,
      intent: null,
      providers: [],
      source: extraction.source,
    };
  }

  if (extraction.needsClarification) {
    return {
      kind: 'clarify',
      message: extraction.clarification,
      intent: extraction.intent,
      providers: [],
      source: extraction.source,
      aiError: extraction.aiError || null,
    };
  }

  const providers = searchProviders(repo, extraction.intent);
  return {
    kind: providers.length ? 'results' : 'empty',
    message: providers.length
      ? null
      : 'We couldn\'t find a matching provider in the demo directory.',
    intent: extraction.intent,
    providers,
    source: extraction.source,
    aiError: extraction.aiError || null,
    aiUnavailable: Boolean(extraction.aiError) || extraction.source.startsWith('fallback'),
    userId,
  };
}

export function createJourneyFromProvider({ repo, userId, providerId, intent, queryText }) {
  const provider = repo.getProvider(providerId);
  if (!provider) return null;
  const snapshot = toProviderRow(provider);
  return repo.createJourney({
    userId,
    providerId: snapshot.id,
    status: 'JOURNEY_STARTED',
    syncStatus: 'synced',
    intent: intent || null,
    queryText: queryText || null,
    providerSnapshot: snapshot,
  });
}

export function queueJourneyAction({ repo, journeyId, userId, actionType, payload }) {
  const journey = repo.getJourney(journeyId, userId);
  if (!journey) return null;
  const action = repo.addJourneyAction({
    journeyId,
    userId,
    actionType,
    payload,
    status: 'pending',
  });
  repo.updateJourney(journeyId, userId, {
    syncStatus: 'pending',
    status: 'SYNC_PENDING',
  });
  return { journey: repo.getJourney(journeyId, userId), action };
}

export function syncJourney({ repo, journeyId, userId }) {
  const journey = repo.getJourney(journeyId, userId);
  if (!journey) return null;

  repo.updateJourney(journeyId, userId, { syncStatus: 'syncing' });

  const pending = repo.listJourneyActions(journeyId, 'pending');
  const completed = [];
  for (const action of pending) {
    repo.updateJourneyAction(action.id, {
      status: 'synced',
      completedAt: new Date().toISOString(),
    });
    completed.push(action.id);
  }

  // Refresh provider snapshot from directory when possible.
  const fresh = repo.getProvider(journey.providerId);
  const patch = {
    syncStatus: 'synced',
    status: 'SYNCED',
  };
  if (fresh) {
    patch.providerSnapshot = toProviderRow(fresh);
  }
  const updated = repo.updateJourney(journeyId, userId, patch);
  return {
    journey: updated,
    syncedActions: completed.length,
    refreshedProvider: Boolean(fresh),
  };
}
