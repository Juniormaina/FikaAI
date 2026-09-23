const ITEM_LABELS = {
  en: {
    maize: 'maize',
    beans: 'beans',
    rice: 'rice',
    milk: 'milk',
    tomatoes: 'tomatoes',
    wheat: 'wheat',
    coffee: 'coffee',
    sugar: 'sugar',
  },
  sw: {
    maize: 'mahindi',
    beans: 'maharagwe',
    rice: 'mchele',
    milk: 'maziwa',
    tomatoes: 'nyanya',
    wheat: 'ngano',
    coffee: 'kahawa',
    sugar: 'sukari',
  },
};

export function todayInNairobi(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(date);
}

export function formatKes(amount) {
  const negative = amount < 0;
  const abs = Math.abs(Number(amount));
  const [whole, fraction] = abs.toFixed(Number.isInteger(abs) ? 0 : 2).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const number = fraction ? `${withCommas}.${fraction}` : withCommas;
  return `${negative ? '-' : ''}KSh ${number}`;
}

export function labelItem(item, lang) {
  const pack = lang === 'sw' ? ITEM_LABELS.sw : ITEM_LABELS.en;
  return pack[item] || item;
}

export function labelUnit(unit, quantity, lang) {
  const n = Number(quantity);
  if (lang === 'sw') {
    if (unit === 'bags') return 'mifuko';
    if (unit === 'kg') return 'kg';
    if (unit === 'litre') return 'lita';
    if (unit === 'pieces') return 'vipande';
    if (unit === 'crates') return 'makreti';
    return unit;
  }
  if (unit === 'bags') return n === 1 ? 'bag' : 'bags';
  if (unit === 'litre') return n === 1 ? 'litre' : 'litres';
  if (unit === 'pieces') return n === 1 ? 'piece' : 'pieces';
  if (unit === 'crates') return n === 1 ? 'crate' : 'crates';
  return unit;
}

export function formatQuantity(quantity, unit, lang) {
  if (quantity == null || !unit) return '';
  const shown = Number.isInteger(Number(quantity)) ? String(quantity) : String(quantity);
  return `${shown} ${labelUnit(unit, quantity, lang === 'sw' ? 'sw' : 'en')}`;
}

export function priceUnit(unit, lang) {
  if (lang === 'sw') {
    if (unit === 'kg') return 'kilo';
    if (unit === 'litre') return 'lita';
  }
  return unit === 'litre' ? 'litre' : unit;
}
