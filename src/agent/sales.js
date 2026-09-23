const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  moja: 1,
  mbili: 2,
  tatu: 3,
  nne: 4,
  tano: 5,
  sita: 6,
  saba: 7,
  nane: 8,
  tisa: 9,
  kumi: 10,
};

const ALIASES = [
  ['tomatoes', 'tomatoes'],
  ['tomato', 'tomatoes'],
  ['maharagwe', 'beans'],
  ['mahindi', 'maize'],
  ['nyanya', 'tomatoes'],
  ['mchele', 'rice'],
  ['maziwa', 'milk'],
  ['sukari', 'sugar'],
  ['kahawa', 'coffee'],
  ['ngano', 'wheat'],
  ['maize', 'maize'],
  ['beans', 'beans'],
  ['rice', 'rice'],
  ['milk', 'milk'],
  ['wheat', 'wheat'],
  ['coffee', 'coffee'],
  ['sugar', 'sugar'],
];

const UNIT_PATTERN = 'bags?|mifuko|mfuko|gunia|kg|kilos?|litres?|liters?|lita|pieces?|pcs|crates?|debe|madebe';

const STOP = new Set([
  'i', 'a', 'an', 'the', 'of', 'for', 'my', 'to', 'today', 'leo', 'please', 'na', 'ya', 'kwa',
  'ksh', 'kes', 'sh', 'and', 'on', 'at', 'me', 'did', 'have', 'was', 'is', 'it', 'this', 'that',
  'with', 'from', 'your', 'you', 'we', 'our', 'just', 'only', 'some', 'per', 'each', 'into',
  'by', 'or', 'ama', 'au', 'sold', 'sell', 'selling', 'sale', 'sales', 'record', 'recorded',
  'rekodi', 'sajili', 'nimeuza', 'nauza', 'kuuza', 'uza', 'nimeandika', 'bags', 'bag', 'mifuko',
  'mfuko', 'gunia', 'kg', 'kilo', 'kilos', 'litre', 'litres', 'liter', 'liters', 'lita', 'pieces',
  'piece', 'pcs', 'crate', 'crates', 'debe', 'madebe', 'three', 'two', 'one', 'amount', 'kiasi',
  'shillings', 'shilling',
]);

function stripThousands(text) {
  let next = text;
  let prev;
  do {
    prev = next;
    next = next.replace(/(\d),(?=\d)/g, '$1');
  } while (next !== prev);
  return next;
}

function normalizeNumberWords(text) {
  return text.replace(/\b([a-z]+)\b/gi, (word) => {
    const value = NUMBER_WORDS[word.toLowerCase()];
    return value === undefined ? word : String(value);
  });
}

export function canonicalUnit(unit) {
  const u = unit.toLowerCase();
  if (/^bags?$/.test(u) || u === 'mifuko' || u === 'mfuko' || u === 'gunia') return 'bags';
  if (/^kilos?$/.test(u) || u === 'kg') return 'kg';
  if (/^litres?$/.test(u) || /^liters?$/.test(u) || u === 'lita') return 'litre';
  if (/^pieces?$/.test(u) || u === 'pcs') return 'pieces';
  if (/^crates?$/.test(u) || u === 'debe' || u === 'madebe') return 'crates';
  return u;
}

export function hasSaleVerb(text) {
  return /\b(sold|selling|sale|sell|nimeuza|nauza|kuuza|uza|record|rekodi|sajili|nimeandika|recorded)\b/i.test(text);
}

const LEFTOVER_STOP = new Set([
  ...STOP,
  'how', 'much', 'many', 'what', 'when', 'where', 'why', 'who', 'market', 'price',
  'weather', 'show', 'view', 'list', 'explain', 'help', 'can', 'information', 'tell',
  'give', 'need', 'want', 'like', 'did', 'does', 'have', 'change', 'update', 'delete',
  'remove', 'last', 'records', 'question',
]);

export function findKnownItem(text) {
  const lower = String(text || '').toLowerCase();
  for (const [alias, canonical] of ALIASES) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) return canonical;
  }
  return null;
}

function leftoverItem(text) {
  const tokens = text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  const leftover = tokens.filter((token) => !LEFTOVER_STOP.has(token));
  if (!leftover.length) return null;
  return leftover.slice(0, 2).join(' ');
}

export function matchQuantity(text) {
  const first = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\b`, 'i'));
  if (first) {
    return { quantity: Number(first[1]), unit: canonicalUnit(first[2]), match: first[0] };
  }
  const second = text.match(new RegExp(`\\b(${UNIT_PATTERN})\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  if (second) {
    return { quantity: Number(second[2]), unit: canonicalUnit(second[1]), match: second[0] };
  }
  return null;
}

function moneyAmount(text) {
  const explicit = text.match(/(?:for|kwa)\s+(?:ksh|kes|shillings?|sh)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (explicit) return Number(explicit[1]);
  const currency = text.match(/\b(?:ksh|kes|shillings?)\s*(\d+(?:\.\d{1,2})?)/i);
  if (currency) return Number(currency[1]);
  const nums = [...text.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)].map((match) => Number(match[1]));
  if (!nums.length) return null;
  return nums[nums.length - 1];
}

function validAmount(amount) {
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000;
}

function isShortItem(token) {
  return token.length >= 3 && /^[a-z][a-z-]*$/.test(token) && !STOP.has(token);
}

export function parseSale(raw) {
  const prepared = normalizeNumberWords(stripThousands(String(raw || '').trim().toLowerCase()));
  const short = prepared.match(/^([a-z][a-z-]{1,40})\s+(\d+(?:\.\d{1,2})?)$/);
  if (short && isShortItem(short[1])) {
    const amountKes = Number(short[2]);
    if (!validAmount(amountKes)) return null;
    return {
      item: findKnownItem(short[1]) || short[1],
      quantity: null,
      unit: null,
      amountKes,
    };
  }

  if (!hasSaleVerb(prepared)) return null;
  const quantity = matchQuantity(prepared);
  const working = quantity ? prepared.replace(quantity.match, ' ') : prepared;
  const amountKes = moneyAmount(working);
  if (!validAmount(amountKes)) return null;
  const item = findKnownItem(prepared) || leftoverItem(prepared);
  if (!item) return null;
  return {
    item,
    quantity: quantity ? quantity.quantity : null,
    unit: quantity ? quantity.unit : null,
    amountKes,
  };
}

export function periodFromText(text) {
  if (/\b(all|ever|history|zote|yote)\b/i.test(text)) return 'all';
  return 'today';
}
