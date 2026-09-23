import { parseExternal } from './rules.js';

const SIGNALS = [
  { intent: 'help_record', weight: 3, any: ['how can i', 'how do i', 'how i can', 'nataka kujua', 'jinsi ya', 'namna ya', 'can i record', 'record my sale', 'help me'] },
  { intent: 'help_record', weight: 3, any: ['sold', 'nimeuza', 'nauza'] },
  { intent: 'help_record', weight: 1, any: ['record', 'rekodi', 'kuuza', 'sale'] },
  { intent: 'query_sales', weight: 3, any: ['how much', 'ngapi', 'kiasi gani', 'total sales', 'mauzo ya leo'] },
  { intent: 'query_sales', weight: 1, any: ['mauzo', 'total', 'jumla'] },
  { intent: 'explain_records', weight: 3, any: ['explain', 'eleza', 'summarise', 'summarize', 'describe'] },
  { intent: 'external_info', weight: 3, any: ['market price', 'bei ya', 'weather', 'hali ya hewa', 'sokoni'] },
  { intent: 'calculate', weight: 3, any: ['calculate', 'hesabu', 'compute'] },
  { intent: 'greeting', weight: 2, any: ['hello', 'habari', 'mambo', 'good morning', 'niaje'] },
  { intent: 'list_records', weight: 2, any: ['show records', 'onyesha', 'angalia', 'what did i record'] },
];

export const LOCAL_CONFIDENCE = 0.62;

export function createHeuristicLocalModel() {
  return {
    name: 'heuristic-local',
    classify(text) {
      const haystack = String(text || '').toLowerCase();
      const scores = new Map();
      for (const signal of SIGNALS) {
        if (signal.any.some((phrase) => haystack.includes(phrase))) {
          scores.set(signal.intent, (scores.get(signal.intent) ?? 0) + signal.weight);
        }
      }
      let best = null;
      let bestScore = 0;
      for (const [intent, score] of scores) {
        if (score > bestScore) {
          best = intent;
          bestScore = score;
        }
      }
      const confidence = bestScore === 0 ? 0 : bestScore / (bestScore + 1.5);
      return {
        intent: best ?? 'chat',
        confidence,
        slots: best === 'external_info' ? parseExternal(text) : {},
      };
    },
  };
}
