export const SIMULATED_MARKET = {
  maize: { amount: 45, unit: 'kg' },
  beans: { amount: 120, unit: 'kg' },
  rice: { amount: 130, unit: 'kg' },
  milk: { amount: 60, unit: 'litre' },
  tomatoes: { amount: 80, unit: 'kg' },
  wheat: { amount: 55, unit: 'kg' },
  coffee: { amount: 400, unit: 'kg' },
  sugar: { amount: 150, unit: 'kg' },
};

export function lookupSimulatedPrice(item) {
  if (!item) return null;
  return SIMULATED_MARKET[item] ?? null;
}
