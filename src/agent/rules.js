import { findKnownItem, parseSale, periodFromText } from './sales.js';

function languageChoice(text) {
  if (/\b(kiswahili|swahili)\b/i.test(text)) return 'sw';
  if (/\b(english|kingereza)\b/i.test(text)) return 'en';
  return null;
}

function matchLanguage(text) {
  const trimmed = text.trim();
  const direct = trimmed.match(/^(?:(?:speak|use|set)\s+)?(?:language\s+)?(english|kiswahili|swahili|kingereza)$/i);
  const swahili = trimmed.match(/^(?:badilisha\s+lugha(?:\s+kuwa)?\s+)(english|kiswahili|swahili|kingereza)$/i);
  const match = direct || swahili;
  if (!match) return null;
  const language = languageChoice(match[1]);
  if (!language) return null;
  return { intent: 'set_language', confidence: 0.98, slots: { language } };
}

function matchCalculate(text) {
  const trimmed = text.trim();
  const prefixed = trimmed.match(/^(?:calculate|hesabu|what is|what's|whats|compute|nini)\s+(.+)$/i);
  const expr = (prefixed ? prefixed[1] : trimmed).trim();
  if (expr.length > 40) return null;
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
  if (!/[+\-*/]/.test(expr)) return null;
  return { intent: 'calculate', confidence: 0.96, slots: { expression: expr } };
}

export function parseExternal(text) {
  let topic = 'other';
  if (/weather|hali ya hewa/i.test(text)) topic = 'weather';
  else if (/price|bei|soko|market|sokoni/i.test(text)) topic = 'market';
  return { topic, item: findKnownItem(text) };
}

function matchExternal(text) {
  if (!/\b(market price|price of|bei ya|weather|hali ya hewa|habari za soko|sokoni)\b/i.test(text)) {
    return null;
  }
  return { intent: 'external_info', confidence: 0.95, slots: parseExternal(text) };
}

function matchDelete(text) {
  if (!/\b(delete|remove|futa)\b/i.test(text) || !/\b(record|rekodi|sale|mauzo|last|mwisho)\b/i.test(text)) {
    return null;
  }
  return { intent: 'delete_record', confidence: 0.93, slots: { item: findKnownItem(text) } };
}

function matchUpdate(text) {
  const match = text.match(/\b(update|change|badilisha|rekebisha|correct)\b[\s\S]*?\b(to|kuwa|iwe)\s*(?:ksh|kes|sh)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amountKes = Number(match[3].replace(/,/g, ''));
  if (!Number.isFinite(amountKes) || amountKes <= 0) return null;
  return {
    intent: 'update_record',
    confidence: 0.94,
    slots: { amountKes, item: findKnownItem(text) },
  };
}

function matchQuery(text) {
  const asksTotal = /\b(how much|how many|ngapi|kiasi gani|total|jumla)\b/i.test(text)
    && /\b(sold|sell|sale|sales|mauzo|nimeuza|uza|record|rekodi)\b/i.test(text);
  const named = /\b(today'?s sales|sales today|mauzo ya leo|mauzo leo|did i sell|have i sold|nimeuza ngapi)\b/i.test(text);
  if (!asksTotal && !named) return null;
  return {
    intent: 'query_sales',
    confidence: 0.96,
    slots: { item: findKnownItem(text), period: periodFromText(text) },
  };
}

function matchExplain(text) {
  if (!/^(explain|eleza|describe|summarise|summarize)\b/i.test(text.trim())) return null;
  return {
    intent: 'explain_records',
    confidence: 0.95,
    slots: { period: periodFromText(text) },
  };
}

function matchList(text) {
  const trimmed = text.trim();
  if (
    !/^(show|view|list|onyesha|angalia)\b/i.test(trimmed)
    && !/\bwhat did i record\b/i.test(trimmed)
    && !/\bnilichorekodi\b/i.test(trimmed)
  ) {
    return null;
  }
  return {
    intent: 'list_records',
    confidence: 0.9,
    slots: { period: periodFromText(text) },
  };
}

function matchHelp(text) {
  if (!/^(help|msaada|saidia|what can you do|unaweza nifanyia nini)[\s?.!]*$/i.test(text.trim())) return null;
  return { intent: 'help', confidence: 0.99, slots: {} };
}

function matchGreeting(text) {
  if (!/^(?:hi|hello|hey|habari(?:\s+yako)?|mambo|niaje|shikamoo|good morning)[\s!.]*$/i.test(text.trim())) {
    return null;
  }
  return { intent: 'greeting', confidence: 0.9, slots: {} };
}

export function matchRules(text) {
  const input = String(text || '').trim();
  if (!input) return null;
  return matchLanguage(input)
    || matchCalculate(input)
    || matchExternal(input)
    || matchDelete(input)
    || matchUpdate(input)
    || matchQuery(input)
    || matchExplain(input)
    || matchList(input)
    || matchHelp(input)
    || matchGreeting(input)
    || matchRecord(input);
}

function matchRecord(text) {
  const sale = parseSale(text);
  if (!sale) return null;
  return { intent: 'record_sale', confidence: 0.97, slots: { sale } };
}
