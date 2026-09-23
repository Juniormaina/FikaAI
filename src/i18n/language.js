import { catalog } from './catalog.js';

const SWAHILI = new Set([
  'nataka', 'kujua', 'nimeuza', 'nauza', 'kuuza', 'mahindi', 'leo', 'ngapi', 'eleza',
  'msaada', 'habari', 'bei', 'soko', 'sokoni', 'sajili', 'rekodi', 'kwa', 'mauzo',
  'kiasi', 'onyesha', 'nilichorekodi', 'badilisha', 'futa', 'lugha', 'kiswahili',
  'mifuko', 'mfuko', 'jinsi', 'taarifa', 'chagua', 'maharagwe', 'mchele', 'maziwa',
  'nyanya', 'ngano', 'kahawa', 'sukari', 'lita', 'jumla', 'yote', 'zote', 'kuwa',
  'andika', 'uliza', 'angalia', 'rudi', 'habari', 'shikamoo', 'niaje',
]);

const ENGLISH = new Set([
  'sold', 'sell', 'selling', 'sale', 'sales', 'today', 'how', 'much', 'explain',
  'help', 'record', 'recorded', 'maize', 'bags', 'bag', 'what', 'show', 'amount',
  'english', 'market', 'price', 'change', 'delete', 'total', 'please', 'hello',
  'weather', 'view', 'list', 'update', 'calculate', 'three', 'for', 'can',
]);

export function detectLanguage(text) {
  const tokens = String(text || '').toLowerCase().match(/[a-z']+/g) ?? [];
  let sw = 0;
  let en = 0;
  for (const token of tokens) {
    if (SWAHILI.has(token)) sw += 1;
    if (ENGLISH.has(token)) en += 1;
  }
  if (/\bnataka kujua\b/i.test(text)) sw += 2;
  if (/\bhow much\b/i.test(text)) en += 2;
  if (/\bnilichorekodi\b/i.test(text)) sw += 2;
  if (sw === 0 && en === 0) return null;
  if (sw > 0 && en > 0) return 'mixed';
  return sw > en ? 'sw' : 'en';
}

export function chooseLanguage(detected, preferred) {
  if (detected === 'en' || detected === 'sw' || detected === 'mixed') return detected;
  return preferred === 'sw' ? 'sw' : 'en';
}

export function t(lang, key, vars = {}) {
  const template = catalog[lang]?.[key] ?? catalog.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

export function replyLanguage(language) {
  return language === 'sw' ? 'sw' : language === 'mixed' ? 'mixed' : 'en';
}
