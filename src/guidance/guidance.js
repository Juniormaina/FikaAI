import {
  DEMO_DATA_SOURCE,
  DEMO_LAST_UPDATED,
  SYNTHETIC_ADVISORIES,
  toAdvisoryRow,
} from './advisories-data.js';
import { extractGuidanceIntent, fallbackIntent, needsClarification } from './intent.js';
import { detectHazard } from './safety.js';

export const MAX_RESULTS = 4;

export function seedAdvisories(repo) {
  const existing = repo.countAdvisories();
  // Always upsert so new or revised advisories reach databases that were seeded earlier.
  for (const advisory of SYNTHETIC_ADVISORIES) {
    repo.upsertAdvisory({
      ...advisory,
      last_updated: DEMO_LAST_UPDATED,
      data_source: DEMO_DATA_SOURCE,
      is_demo_data: true,
    });
  }
  return { seeded: existing === 0, count: SYNTHETIC_ADVISORIES.length };
}

function symptomHits(advisory, text) {
  const haystack = String(text || '').toLowerCase();
  if (!haystack) return 0;
  return (advisory.symptoms || []).filter((symptom) => haystack.includes(symptom.toLowerCase())).length;
}

/**
 * Deterministic ranking. The "match" number is a transparent keyword score,
 * not a diagnostic probability.
 */
export function scoreAdvisory(advisory, intent = {}, text = '') {
  let score = 40;
  if (intent.crop && advisory.crops.includes(intent.crop)) score += 20;
  if (intent.region && advisory.regions.includes(intent.region)) score += 10;
  if (intent.topic && advisory.category === intent.topic) score += 10;
  score += Math.min(20, symptomHits(advisory, text) * 5);
  return Math.min(96, score);
}

export function searchAdvisories(repo, intent = {}, text = '') {
  const crop = intent.crop || null;
  const topic = intent.topic || null;
  let rows = crop ? repo.searchAdvisories({ crop }) : repo.listAdvisories();
  if (!crop && topic) rows = rows.filter((row) => row.category === topic);
  if (!crop && !topic) return [];

  return rows
    .map((row) => ({
      ...toAdvisoryRow(row),
      matchPercent: scoreAdvisory(row, intent, text),
      symptomHits: symptomHits(row, text),
    }))
    .sort((a, b) => (
      b.matchPercent - a.matchPercent
      || (a.urgency === 'urgent' ? -1 : 0) - (b.urgency === 'urgent' ? -1 : 0)
      || a.title.localeCompare(b.title)
    ))
    .slice(0, MAX_RESULTS);
}

export async function runGuidanceSearch({ repo, llm, text, userId }) {
  const extraction = await extractGuidanceIntent(text, { llm });

  if (extraction.hazard) {
    return {
      kind: 'hazard',
      hazardKind: extraction.hazardKind,
      message: extraction.message,
      intent: null,
      advisories: [],
      source: extraction.source,
    };
  }

  if (extraction.needsClarification) {
    return {
      kind: 'clarify',
      message: extraction.clarification,
      intent: extraction.intent,
      advisories: [],
      source: extraction.source,
      aiError: extraction.aiError || null,
    };
  }

  const advisories = searchAdvisories(repo, extraction.intent, text);
  return {
    kind: advisories.length ? 'results' : 'empty',
    message: advisories.length
      ? null
      : 'We couldn\'t find matching guidance in the demo library.',
    intent: extraction.intent,
    advisories,
    source: extraction.source,
    aiError: extraction.aiError || null,
    aiUnavailable: Boolean(extraction.aiError) || extraction.source.startsWith('fallback'),
    userId,
  };
}

/**
 * Used by the SMS/USSD/web agent. Deterministic: no LLM, so it works offline.
 */
export function answerGuidanceText(repo, text) {
  const hazard = detectHazard(text);
  if (hazard.isHazard) return { kind: 'hazard', message: hazard.message };
  const intent = fallbackIntent(text);
  if (needsClarification(intent)) return { kind: 'clarify', intent };
  const [best] = searchAdvisories(repo, intent, text);
  if (!best) return { kind: 'empty', intent };
  return { kind: 'result', intent, advisory: best };
}

export function createPlanFromAdvisory({ repo, userId, advisoryId, intent, queryText }) {
  const advisory = repo.getAdvisory(advisoryId);
  if (!advisory) return null;
  const snapshot = toAdvisoryRow(advisory);
  return repo.createPlan({
    userId,
    advisoryId: snapshot.id,
    status: 'PLAN_SAVED',
    syncStatus: 'synced',
    intent: intent || null,
    queryText: queryText || null,
    advisorySnapshot: snapshot,
  });
}

export function queuePlanAction({ repo, planId, userId, actionType, payload }) {
  const plan = repo.getPlan(planId, userId);
  if (!plan) return null;
  const action = repo.addPlanAction({
    planId,
    userId,
    actionType,
    payload,
    status: 'pending',
  });
  repo.updatePlan(planId, userId, {
    syncStatus: 'pending',
    status: 'SYNC_PENDING',
  });
  return { plan: repo.getPlan(planId, userId), action };
}

export function syncPlan({ repo, planId, userId }) {
  const plan = repo.getPlan(planId, userId);
  if (!plan) return null;

  repo.updatePlan(planId, userId, { syncStatus: 'syncing' });

  const pending = repo.listPlanActions(planId, 'pending');
  const completed = [];
  for (const action of pending) {
    repo.updatePlanAction(action.id, {
      status: 'synced',
      completedAt: new Date().toISOString(),
    });
    completed.push(action.id);
  }

  // Refresh the advisory snapshot from the library when possible.
  const fresh = repo.getAdvisory(plan.advisoryId);
  const patch = {
    syncStatus: 'synced',
    status: 'SYNCED',
  };
  if (fresh) {
    patch.advisorySnapshot = toAdvisoryRow(fresh);
  }
  const updated = repo.updatePlan(planId, userId, patch);
  return {
    plan: updated,
    syncedActions: completed.length,
    refreshedAdvisory: Boolean(fresh),
  };
}
