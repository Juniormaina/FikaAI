/**
 * Healthcare intent extraction.
 * AI extracts structured intent; deterministic fallback keeps the demo reliable.
 * The model must NEVER invent hospitals, doctors, or availability.
 */

import { detectEmergency } from './safety.js';

export const SPECIALTIES = [
  'cardiology',
  'dermatology',
  'general practice',
  'maternal health',
  'orthopedics',
  'pediatrics',
];

export const REQUEST_TYPES = [
  'specialist_consultation',
  'general_consultation',
  'maternal_care',
  'pediatric_care',
  'other',
];

export const URGENCIES = ['routine', 'soon', 'unclear'];

const SPECIALTY_ALIASES = [
  { specialty: 'cardiology', patterns: [/\bcardiolog/i, /\bheart\s+(specialist|doctor|clinic|problem|problems|issue|issues)\b/i, /\bheart\b/i] },
  { specialty: 'dermatology', patterns: [/\bdermatolog/i, /\bskin\s+(specialist|doctor|clinic|problem|problems|rash)\b/i, /\bskin\b/i] },
  { specialty: 'orthopedics', patterns: [/\borthop(?:a)?edic/i, /\bbone\s+(specialist|doctor|clinic)\b/i, /\bjoint\b/i, /\bfracture\b/i] },
  { specialty: 'pediatrics', patterns: [/\bpediatr/i, /\bpaediatr/i, /\bchild(?:ren)?(?:'s)?\s+(doctor|specialist|clinic|care)\b/i, /\bkids?\b/i] },
  { specialty: 'maternal health', patterns: [/\bmaternal\b/i, /\bantenatal\b/i, /\bpregnan/i, /\bobstetric/i, /\bgyn(?:ae|e)colog/i, /\bmaternity\b/i] },
  { specialty: 'general practice', patterns: [/\bgeneral\s+pract/i, /\bgp\b/i, /\bfamily\s+(doctor|clinic|medicine)\b/i, /\bclinic\b/i, /\bdoctor\b/i] },
];

const LOCATION_ALIASES = [
  { location: 'Nairobi', patterns: [/\bnairobi\b/i, /\bwestlands\b/i, /\bkileleshwa\b/i, /\bkilimani\b/i, /\bparklands\b/i, /\bdonholm\b/i] },
  { location: 'Mombasa', patterns: [/\bmombasa\b/i] },
  { location: 'Kisumu', patterns: [/\bkisumu\b/i] },
];

const INTENT_SYSTEM_PROMPT = `You extract healthcare-access search intent for FikaAI.
Return ONLY valid JSON with this exact shape:
{"specialty":"cardiology|dermatology|general practice|maternal health|orthopedics|pediatrics|null","location":"Nairobi|Mombasa|Kisumu|null","request_type":"specialist_consultation|general_consultation|maternal_care|pediatric_care|other","urgency":"routine|soon|unclear","confidence":0.0}
Rules:
- specialty and location must be from the allowed lists or null.
- Do NOT invent hospitals, doctors, availability, diagnoses, or medicines.
- confidence is 0 to 1.
- If unsure, lower confidence and use null for unknown fields.
- Output JSON only. No markdown. No explanation.`;

export function validateIntent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'not_an_object' };
  }

  let specialty = normalizeSpecialty(raw.specialty);
  let location = normalizeLocation(raw.location);
  const requestType = REQUEST_TYPES.includes(raw.request_type)
    ? raw.request_type
    : inferRequestType(specialty);
  const urgency = URGENCIES.includes(raw.urgency) ? raw.urgency : 'unclear';
  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));

  if (specialty === null && location === null && confidence > 0.4) {
    confidence = Math.min(confidence, 0.35);
  }

  return {
    ok: true,
    intent: {
      specialty,
      location,
      request_type: requestType,
      urgency,
      confidence,
    },
  };
}

function normalizeSpecialty(value) {
  if (value == null || value === '' || value === 'null') return null;
  const text = String(value).trim().toLowerCase();
  const match = SPECIALTIES.find((item) => item === text);
  if (match) return match;
  if (text.includes('cardio') || text.includes('heart')) return 'cardiology';
  if (text.includes('derma') || text.includes('skin')) return 'dermatology';
  if (text.includes('ortho') || text.includes('bone')) return 'orthopedics';
  if (text.includes('pediatr') || text.includes('paediatr') || text.includes('child')) return 'pediatrics';
  if (text.includes('maternal') || text.includes('pregnan') || text.includes('antenatal')) return 'maternal health';
  if (text.includes('general') || text === 'gp') return 'general practice';
  return null;
}

function normalizeLocation(value) {
  if (value == null || value === '' || value === 'null') return null;
  const text = String(value).trim().toLowerCase();
  if (text.includes('nairobi')) return 'Nairobi';
  if (text.includes('mombasa')) return 'Mombasa';
  if (text.includes('kisumu')) return 'Kisumu';
  return null;
}

function inferRequestType(specialty) {
  if (specialty === 'maternal health') return 'maternal_care';
  if (specialty === 'pediatrics') return 'pediatric_care';
  if (specialty === 'general practice') return 'general_consultation';
  if (specialty) return 'specialist_consultation';
  return 'other';
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

/**
 * Deterministic fallback — keyword mapping, no LLM required.
 */
export function fallbackIntent(text) {
  const input = String(text || '').trim();
  let specialty = null;
  let confidence = 0.4;

  for (const entry of SPECIALTY_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(input))) {
      specialty = entry.specialty;
      confidence = 0.82;
      break;
    }
  }

  let location = null;
  for (const entry of LOCATION_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(input))) {
      location = entry.location;
      confidence = Math.max(confidence, specialty ? 0.9 : 0.75);
      break;
    }
  }

  if (!specialty && /\b(specialist|doctor|clinic|hospital|care|healthcare)\b/i.test(input)) {
    specialty = 'general practice';
    confidence = Math.max(confidence, 0.55);
  }

  if (!location && specialty) {
    location = 'Nairobi';
    confidence = Math.min(confidence, 0.72);
  }

  return {
    specialty,
    location,
    request_type: inferRequestType(specialty),
    urgency: 'routine',
    confidence,
    source: 'fallback',
  };
}

export function needsClarification(intent) {
  if (!intent) return true;
  if (intent.confidence < 0.55) return true;
  if (!intent.specialty && !intent.location) return true;
  return false;
}

export function clarificationPrompt(intent, originalText) {
  const specialty = intent?.specialty || 'a healthcare provider';
  const location = intent?.location || 'your area';
  if (intent?.specialty && intent?.location) {
    return `I want to make sure I understand. Are you looking for ${specialty} care in ${location}?`;
  }
  if (intent?.specialty) {
    return `I want to make sure I understand. Are you looking for ${specialty} care? Which city or area?`;
  }
  if (intent?.location) {
    return `I want to make sure I understand. What kind of healthcare do you need in ${location}? For example: cardiology, pediatrics, or general practice.`;
  }
  return `I want to make sure I understand. Could you say what specialty you need and where? For example: “I need a cardiologist in Nairobi.” (You wrote: “${String(originalText || '').slice(0, 120)}”)`;
}

export async function extractHealthcareIntent(text, { llm = null } = {}) {
  const emergency = detectEmergency(text);
  if (emergency.isEmergency) {
    return {
      emergency: true,
      message: emergency.message,
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
      const parsed = parseIntentJson(response?.text);
      if (parsed.ok) {
        intent = {
          ...parsed.intent,
          source: response.provider || 'llm',
          provider: response.provider || null,
          model: response.model || null,
        };
        source = response.provider === 'mock' ? 'fallback_via_mock' : (response.provider || 'llm');
        // Mock LLM won't return valid healthcare JSON — fall through.
        if (response.provider === 'mock' || source === 'fallback_via_mock') {
          intent = null;
        }
      } else {
        aiError = parsed.error;
      }
    } catch (error) {
      aiError = error instanceof Error ? error.message : 'ai_unavailable';
    }
  }

  if (!intent) {
    intent = fallbackIntent(text);
    source = llm && aiError ? 'fallback_after_ai_error' : 'fallback';
  }

  return {
    emergency: false,
    intent,
    source,
    aiError,
    needsClarification: needsClarification(intent),
    clarification: needsClarification(intent) ? clarificationPrompt(intent, text) : null,
  };
}
