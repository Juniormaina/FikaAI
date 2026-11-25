/**
 * Farming-guidance intent extraction.
 * AI extracts structured intent; deterministic fallback keeps the demo reliable.
 * The model must NEVER invent diagnoses, pesticide products, dosages, or weather.
 */

import { detectHazard } from './safety.js';

export const CROPS = ['maize', 'beans', 'tomatoes', 'potatoes', 'coffee', 'dairy cattle'];
export const REGIONS = ['Kiambu', 'Nakuru', 'Nyandarua', 'Machakos'];
export const TOPICS = ['nutrient', 'pest', 'disease', 'water', 'planting', 'livestock', 'other'];
export const URGENCIES = ['routine', 'soon', 'unclear'];

const CROP_ALIASES = [
  { crop: 'dairy cattle', patterns: [/\bdairy\b/i, /\bcows?\b/i, /\bcattle\b/i, /\bng'?ombe\b/i, /\bmastitis\b/i, /\bheifers?\b/i, /\budder\b/i] },
  { crop: 'maize', patterns: [/\bmaize\b/i, /\bcorn\b/i, /\bmahindi\b/i] },
  { crop: 'beans', patterns: [/\bbeans?\b/i, /\bmaharagwe\b/i] },
  { crop: 'tomatoes', patterns: [/\btomato(?:es)?\b/i, /\bnyanya\b/i] },
  { crop: 'potatoes', patterns: [/\bpotato(?:es)?\b/i, /\bviazi\b/i] },
  { crop: 'coffee', patterns: [/\bcoffee\b/i, /\bkahawa\b/i] },
];

// Terms that imply a crop even when the farmer does not name it.
const IMPLIED_CROPS = [
  { crop: 'maize', patterns: [/\barmy\s?worms?\b/i, /\bviwavi\s+jeshi\b/i, /\blethal\s+necrosis\b/i, /\bmln\b/i] },
  { crop: 'coffee', patterns: [/\bberry\s+disease\b/i, /\bcbd\b/i] },
];

const REGION_ALIASES = [
  { region: 'Kiambu', patterns: [/\bkiambu\b/i, /\bgithunguri\b/i, /\bkikuyu\b/i, /\blimuru\b/i, /\bthika\b/i] },
  { region: 'Nakuru', patterns: [/\bnakuru\b/i, /\bnaivasha\b/i, /\brift\s+valley\b/i, /\bmolo\b/i] },
  { region: 'Nyandarua', patterns: [/\bnyandarua\b/i, /\bol\s?kalou\b/i, /\bnjabini\b/i] },
  { region: 'Machakos', patterns: [/\bmachakos\b/i, /\bkathiani\b/i, /\bmasinga\b/i] },
];

const TOPIC_PATTERNS = [
  { topic: 'livestock', patterns: [/\bfeed\b/i, /\bfodder\b/i, /\bsilage\b/i, /\bmilk\b/i, /\bmastitis\b/i] },
  { topic: 'pest', patterns: [/\bpests?\b/i, /\barmy\s?worms?\b/i, /\bviwavi\b/i, /\binsects?\b/i, /\baphids?\b/i, /\bthrips\b/i, /\bworms?\b/i, /\blarva[e]?\b/i, /\bborers?\b/i, /\bcaterpillars?\b/i, /\bwadudu\b/i] },
  { topic: 'disease', patterns: [/\bblight\b/i, /\brot\b/i, /\bmou?ld\b/i, /\bwilt(?:ing)?\b/i, /\bfung(?:us|al)\b/i, /\bvirus\b/i, /\bviral\b/i, /\brust\b/i, /\bdisease\b/i, /\bnecrosis\b/i, /\bugonjwa\b/i] },
  { topic: 'water', patterns: [/\bwaterlog/i, /\bflood/i, /\bdrain/i, /\bdrought\b/i, /\bdry\s+spell\b/i, /\bstanding\s+water\b/i, /\birrigat/i] },
  { topic: 'planting', patterns: [/\bwhen\s+to\s+plant\b/i, /\bplanting\b/i, /\bsowing\b/i, /\bseeds?\b/i, /\bspacing\b/i, /\bgerminat/i, /\bkupanda\b/i] },
  { topic: 'nutrient', patterns: [/\bnitrogen\b/i, /\bfertili[sz]er\b/i, /\bdeficien/i, /\btop[\s-]?dress/i, /\bnutrient/i, /\bmanure\b/i, /\bmbolea\b/i] },
];

const PROBLEM_WORDS = /\b(yellow(?:ing)?|pale|leaf|leaves|spots?|dying|wilting|stunted|holes|eaten|chewed|sick|problem|pests?|disease|blight|rot|plant(?:ing)?|feed|swollen|clots|manjano|majani|ugonjwa|wadudu)\b/i;
const SALE_WORDS = /\b(sold|sell|selling|sale|sales|nimeuza|nauza|kuuza|mauzo|rekodi|record)\b/i;

const INTENT_SYSTEM_PROMPT = `You extract farming-guidance search intent for FikaAI.
Return ONLY valid JSON with this exact shape:
{"crop":"maize|beans|tomatoes|potatoes|coffee|dairy cattle|null","region":"Kiambu|Nakuru|Nyandarua|Machakos|null","topic":"nutrient|pest|disease|water|planting|livestock|other|null","urgency":"routine|soon|unclear","confidence":0.0}
Rules:
- crop, region and topic must be from the allowed lists or null.
- Do NOT invent diagnoses, pesticide products, dosages, or weather.
- confidence is 0 to 1.
- If unsure, lower confidence and use null for unknown fields.
- Output JSON only. No markdown. No explanation.`;

export function validateIntent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'not_an_object' };
  }

  const crop = normalizeCrop(raw.crop);
  const region = normalizeRegion(raw.region);
  const topic = normalizeTopic(raw.topic, crop);
  const urgency = URGENCIES.includes(raw.urgency) ? raw.urgency : 'unclear';
  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));

  if (crop === null && topic === null && region === null && confidence > 0.4) {
    confidence = Math.min(confidence, 0.35);
  }

  return {
    ok: true,
    intent: { crop, region, topic, urgency, confidence },
  };
}

function normalizeCrop(value) {
  if (value == null || value === '' || value === 'null') return null;
  const text = String(value).trim().toLowerCase();
  const match = CROPS.find((item) => item === text);
  if (match) return match;
  if (text.includes('maize') || text.includes('corn')) return 'maize';
  if (text.includes('bean')) return 'beans';
  if (text.includes('tomato')) return 'tomatoes';
  if (text.includes('potato')) return 'potatoes';
  if (text.includes('coffee')) return 'coffee';
  if (text.includes('dairy') || text.includes('cow') || text.includes('cattle')) return 'dairy cattle';
  return null;
}

function normalizeRegion(value) {
  if (value == null || value === '' || value === 'null') return null;
  const text = String(value).trim().toLowerCase();
  return REGIONS.find((region) => text.includes(region.toLowerCase())) ?? null;
}

function normalizeTopic(value, crop) {
  if (value == null || value === '' || value === 'null') {
    return crop === 'dairy cattle' ? 'livestock' : null;
  }
  const text = String(value).trim().toLowerCase();
  const match = TOPICS.find((item) => item === text);
  if (match) return match;
  if (text.includes('nutri') || text.includes('fertil') || text.includes('soil')) return 'nutrient';
  if (text.includes('pest') || text.includes('insect')) return 'pest';
  if (text.includes('disease') || text.includes('blight')) return 'disease';
  if (text.includes('water') || text.includes('drain')) return 'water';
  if (text.includes('plant') || text.includes('seed')) return 'planting';
  if (text.includes('livestock') || text.includes('dairy') || text.includes('feed')) return 'livestock';
  return null;
}

export function parseIntentJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, error: 'empty' };

  let candidate = raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidate = fenced[1].trim();
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (objectMatch) candidate = objectMatch[0];

  try {
    return validateIntent(JSON.parse(candidate));
  } catch {
    return { ok: false, error: 'malformed_json' };
  }
}

function firstMatch(entries, key, input) {
  for (const entry of entries) {
    if (entry.patterns.some((pattern) => pattern.test(input))) return entry[key];
  }
  return null;
}

/**
 * Deterministic fallback — keyword mapping, no LLM required.
 */
export function fallbackIntent(text) {
  const input = String(text || '').trim();

  let crop = firstMatch(CROP_ALIASES, 'crop', input);
  let impliedCrop = false;
  if (!crop) {
    crop = firstMatch(IMPLIED_CROPS, 'crop', input);
    impliedCrop = Boolean(crop);
  }
  const region = firstMatch(REGION_ALIASES, 'region', input);
  let topic = firstMatch(TOPIC_PATTERNS, 'topic', input);
  if (!topic && crop === 'dairy cattle') topic = 'livestock';

  let confidence = 0.3;
  if (crop) confidence = impliedCrop ? 0.7 : 0.62;
  if (crop && region) confidence += 0.13;
  if (crop && topic) confidence += 0.1;
  if (!crop && topic && PROBLEM_WORDS.test(input)) confidence = 0.4;
  if (!crop && !topic && region) confidence = 0.3;
  confidence = Math.min(0.95, confidence);

  return {
    crop,
    region,
    topic,
    urgency: 'routine',
    confidence,
    source: 'fallback',
  };
}

/**
 * Used by the SMS/USSD/web agent to decide whether a message is a crop or
 * livestock question rather than a sale record or bookkeeping request.
 */
export function isGuidanceQuestion(text) {
  const input = String(text || '').trim();
  if (!input) return false;
  if (detectHazard(input).isHazard) return true;
  if (SALE_WORDS.test(input)) return false;
  const intent = fallbackIntent(input);
  return Boolean(intent.crop) && (Boolean(intent.topic) || PROBLEM_WORDS.test(input));
}

export function needsClarification(intent) {
  if (!intent) return true;
  if (intent.confidence < 0.55) return true;
  if (!intent.crop) return true;
  return false;
}

export function clarificationPrompt(intent, originalText) {
  const cropList = 'maize, beans, tomatoes, potatoes, coffee, or dairy cattle';
  if (intent?.region && !intent?.crop) {
    return `I want to make sure I understand. Which crop or animal is this about in ${intent.region}? For example: ${cropList}.`;
  }
  return `I want to make sure I understand. Which crop or animal is this about, and where? For example: “Maize leaf yellowing in Kiambu.” (You wrote: “${String(originalText || '').slice(0, 120)}”)`;
}

export async function extractGuidanceIntent(text, { llm = null } = {}) {
  const hazard = detectHazard(text);
  if (hazard.isHazard) {
    return {
      hazard: true,
      hazardKind: hazard.kind,
      message: hazard.message,
      intent: null,
      source: 'safety',
    };
  }

  let intent = null;
  let source = 'fallback';
  let aiError = null;

  if (llm) {
    try {
      const response = await llm.generate({
        system: INTENT_SYSTEM_PROMPT,
        prompt: `USER_REQUEST:\n${String(text || '').trim()}\n\nJSON:`,
        temperature: 0,
      });
      if (response?.provider === 'mock') {
        // The mock LLM never returns valid intent JSON — use the fallback.
        source = 'fallback_via_mock';
      } else {
        const parsed = parseIntentJson(response?.text);
        if (parsed.ok) {
          intent = {
            ...parsed.intent,
            source: response.provider || 'llm',
            provider: response.provider || null,
            model: response.model || null,
          };
          source = response.provider || 'llm';
        } else {
          aiError = parsed.error;
        }
      }
    } catch (error) {
      aiError = error instanceof Error ? error.message : 'ai_unavailable';
    }
  }

  if (!intent) {
    intent = fallbackIntent(text);
    if (source !== 'fallback_via_mock') {
      source = llm && aiError ? 'fallback_after_ai_error' : 'fallback';
    }
  }

  const clarify = needsClarification(intent);
  return {
    hazard: false,
    intent,
    source,
    aiError,
    needsClarification: clarify,
    clarification: clarify ? clarificationPrompt(intent, text) : null,
  };
}
