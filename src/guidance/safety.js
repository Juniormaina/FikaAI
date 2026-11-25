/**
 * Deterministic field-hazard safety layer.
 * Does NOT diagnose. Flags language about poisoning or sudden animal death so
 * the UI can redirect to medical, veterinary, or extension help first.
 */

const PEOPLE_HAZARD_PATTERNS = [
  /\b(swallowed|drank|drunk|ingested)\b.*\b(pesticide|chemical|poison|spray|insecticide|herbicide)\b/i,
  /\b(pesticide|insecticide|herbicide)\s+poisoning\b/i,
  /\b(dizzy|vomiting|fainted|convulsions?|can'?t\s+breathe|difficulty\s+breathing)\b.*\b(spray(ing|ed)?|pesticide|chemical)\b/i,
  /\b(spray(ing|ed)?|pesticide|chemical)\b.*\b(dizzy|vomiting|fainted|convulsions?|can'?t\s+breathe|difficulty\s+breathing)\b/i,
  /\bchemical\b.*\b(in|on)\s+(his|her|my|the)\s+(eyes?|skin)\b/i,
];

const ANIMAL_HAZARD_PATTERNS = [
  /\banthrax\b/i,
  /\b(swollen\s+head|blue\s+comb|purple\s+comb)\b.*\b(chickens?|hens?|birds?|flock|poultry)\b/i,
  /\bsudden\s+death\b.*\b(cattle|cows?|goats?|sheep|livestock|animals?|herd)\b/i,
  /\b(cattle|cows?|goats?|sheep|livestock|animals?|herd)\b.*\b(suddenly\s+died|sudden\s+death|dropped\s+dead|dying\s+suddenly)\b/i,
  /\bbleeding\b.*\b(carcass|dead\s+(cow|animal|goat|sheep))\b/i,
];

export const PEOPLE_HAZARD_MESSAGE =
  'This may be a poisoning emergency. Move the person away from the chemical, remove contaminated clothing, and get medical help or call your local emergency service immediately. Keep the product label with you. FikaAI cannot diagnose poisoning.';

export const ANIMAL_HAZARD_MESSAGE =
  'Sudden animal or bird deaths can be a notifiable disease risk. Do not open or move the carcasses, and do not sell, eat or move the animals or birds. Keep people and other animals away and contact your county veterinary officer or extension officer immediately. FikaAI cannot diagnose animal disease.';

const BIRD_WORDS = /\b(chickens?|hens?|birds?|flock|poultry|ducks?|turkeys?|kuku)\b/i;
const MASS_WORDS = /\b(sudden(?:ly)?|overnight|many|several|lots|all|mass|dozens?|wanakufa|wamekufa)\b/i;
const DEATH_WORDS = /\b(died|dead|dying|deaths?|mortality|dropped|kufa|wanakufa|wamekufa)\b/i;

/** A flock die-off (sudden or many deaths) can be a notifiable disease such as Newcastle or avian influenza. */
function isFlockDieOff(input) {
  return BIRD_WORDS.test(input) && MASS_WORDS.test(input) && DEATH_WORDS.test(input);
}

export function detectHazard(text) {
  const input = String(text || '').trim();
  if (!input) return { isHazard: false };
  if (PEOPLE_HAZARD_PATTERNS.some((pattern) => pattern.test(input))) {
    return { isHazard: true, kind: 'people', message: PEOPLE_HAZARD_MESSAGE };
  }
  if (isFlockDieOff(input) || ANIMAL_HAZARD_PATTERNS.some((pattern) => pattern.test(input))) {
    return { isHazard: true, kind: 'animal', message: ANIMAL_HAZARD_MESSAGE };
  }
  return { isHazard: false };
}
