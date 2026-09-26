/**
 * Deterministic emergency-language safety layer.
 * Does NOT diagnose. Flags urgent language so the UI can redirect to emergency help.
 */

const EMERGENCY_PATTERNS = [
  /\bsevere\s+chest\s+pain\b/i,
  /\bchest\s+pain\b.*\b(severe|crushing|sudden)\b/i,
  /\b(difficulty|trouble|hard)\s+(breathing|breath)\b/i,
  /\bcan'?t\s+breathe\b/i,
  /\bunconscious\b/i,
  /\bloss\s+of\s+consciousness\b/i,
  /\bsevere\s+bleed(ing)?\b/i,
  /\bbleeding\s+(heavily|uncontrollably)\b/i,
  /\bstroke\b/i,
  /\bface\s+drooping\b/i,
  /\bslurred\s+speech\b/i,
  /\bsuicidal\b/i,
  /\boverdose\b/i,
  /\bchoking\b/i,
  /\bheart\s+attack\b/i,
];

export const EMERGENCY_MESSAGE =
  'This may require urgent medical attention. Please seek emergency medical help or contact your local emergency service immediately. FikaAI does not diagnose medical conditions and cannot determine whether a situation is an emergency.';

export function detectEmergency(text) {
  const input = String(text || '').trim();
  if (!input) return { isEmergency: false };
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(input)) {
      return { isEmergency: true, message: EMERGENCY_MESSAGE };
    }
  }
  return { isEmergency: false };
}
