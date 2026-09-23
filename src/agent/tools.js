import { evaluateExpression, formatResult } from './calculator.js';
import { lookupSimulatedPrice } from './knowledge.js';
import { parseSale } from './sales.js';
import { SYSTEM_PROMPT, buildLlmPrompt } from '../llm/provider.js';
import { formatKes, formatQuantity, labelItem, priceUnit, todayInNairobi } from '../i18n/format.js';
import { t } from '../i18n/language.js';

function pack(language) {
  if (language === 'sw') return 'sw';
  if (language === 'mixed') return 'mixed';
  return 'en';
}

function displayLang(language) {
  return language === 'sw' ? 'sw' : 'en';
}

function saleText(language, draft) {
  const lang = pack(language);
  const shown = displayLang(language);
  const lines = [t(lang, 'recordedTitle', {
    item: labelItem(draft.item, shown),
    itemSw: labelItem(draft.item, 'sw'),
  })];
  const quantity = formatQuantity(draft.quantity, draft.unit, shown);
  if (quantity) lines.push(t(lang, 'recordedQuantity', { quantity }));
  lines.push(t(lang, 'recordedAmount', { amount: formatKes(draft.amountKes) }));
  return lines.join('\n');
}

function promptRecords(records) {
  return records.map((record) => ({
    item: record.item,
    itemEn: labelItem(record.item, 'en'),
    itemSw: labelItem(record.item, 'sw'),
    quantity: record.quantity,
    unit: record.unit,
    amountKes: record.amountKes,
    amountLabel: formatKes(record.amountKes),
    recordedOn: record.recordedOn,
  }));
}

export function createTools({ repo, llm }) {
  return {
    async run(input) {
      switch (input.intent) {
        case 'record_sale':
          return this.recordSale(input);
        case 'query_sales':
          return this.querySales(input);
        case 'list_records':
          return this.listRecords(input);
        case 'update_record':
          return this.updateRecord(input);
        case 'delete_record':
          return this.deleteRecord(input);
        case 'calculate':
          return this.calculate(input);
        case 'external_info':
          return this.externalInfo(input);
        case 'explain_records':
          return this.explain(input);
        case 'help':
          return { text: t(pack(input.language), 'help'), actions: [] };
        case 'help_record':
          return { text: t(pack(input.language), 'helpRecord'), actions: [] };
        case 'greeting':
          return { text: t(pack(input.language), 'greeting'), actions: [] };
        case 'set_language':
          return this.setLanguage(input);
        default:
          return this.chat(input);
      }
    },

    recordSale({ userId, language, slots, userText }) {
      const draft = slots.sale || parseSale(userText);
      if (!draft) {
        return { text: t(pack(language), 'clarifySale'), actions: [] };
      }
      const saved = repo.createRecord({
        userId,
        item: draft.item,
        quantity: draft.quantity,
        unit: draft.unit,
        amountKes: draft.amountKes,
        recordedOn: todayInNairobi(),
      });
      return {
        text: saleText(language, draft),
        actions: [{
          type: 'tool',
          name: 'local_database',
          detail: `Inserted ${saved.item} sale ${saved.amountKes}`,
        }],
      };
    },

    querySales({ userId, language, slots }) {
      const period = slots.period === 'all' ? 'all' : 'today';
      const item = slots.item || null;
      const records = repo.listRecords(userId, {
        recordedOn: period === 'all' ? undefined : todayInNairobi(),
        item: item || undefined,
      });
      const lang = pack(language);
      const shown = displayLang(language);
      const label = item ? labelItem(item, shown) : '';
      const itemSw = item ? labelItem(item, 'sw') : '';
      const total = formatKes(records.reduce((sum, record) => sum + record.amountKes, 0));
      let text;
      if (!records.length) {
        if (period === 'all') text = t(lang, 'queryNoneAll', { item: label, itemSw });
        else text = t(lang, item ? 'queryNoneItem' : 'queryNone', { item: label, itemSw });
      } else if (period === 'all') {
        text = t(lang, item ? 'queryAllItem' : 'queryAll', { amount: total, item: label, itemSw });
      } else {
        text = t(lang, item ? 'queryTodayItem' : 'queryToday', { amount: total, item: label, itemSw });
      }
      return {
        text,
        actions: [{ type: 'tool', name: 'local_database', detail: 'Read sales totals' }],
      };
    },

    listRecords({ userId, language, slots }) {
      const period = slots.period === 'all' ? 'all' : 'today';
      const records = repo.listRecords(userId, {
        recordedOn: period === 'all' ? undefined : todayInNairobi(),
      });
      const lang = language === 'sw' ? 'sw' : 'en';
      if (!records.length) {
        return {
          text: t(lang, period === 'all' ? 'listEmptyAll' : 'listEmpty'),
          actions: [{ type: 'tool', name: 'local_database', detail: 'Read sales list' }],
        };
      }
      const lines = records.map((record) => {
        const name = labelItem(record.item, lang);
        const quantity = formatQuantity(record.quantity, record.unit, lang);
        const amount = formatKes(record.amountKes);
        return quantity ? `- ${name}: ${quantity}, ${amount}` : `- ${name}: ${amount}`;
      });
      const total = formatKes(records.reduce((sum, record) => sum + record.amountKes, 0));
      const text = [
        t(lang, period === 'all' ? 'listHeaderAll' : 'listHeader'),
        ...lines,
        t(lang, 'listTotal', { amount: total }),
      ].join('\n');
      return {
        text,
        actions: [{ type: 'tool', name: 'local_database', detail: 'Read sales list' }],
      };
    },

    updateRecord({ userId, language, slots }) {
      const lang = pack(language);
      const shown = displayLang(language);
      const current = repo.latestRecord(userId, slots.item || undefined);
      if (!current) {
        return {
          text: t(lang, 'updateMissing'),
          actions: [{ type: 'tool', name: 'local_database', detail: 'No sale to update' }],
        };
      }
      repo.updateRecord(current.id, userId, { amountKes: slots.amountKes });
      return {
        text: t(lang, 'updated', {
          item: labelItem(current.item, shown),
          amount: formatKes(slots.amountKes),
        }),
        actions: [{ type: 'tool', name: 'local_database', detail: `Updated ${current.item}` }],
      };
    },

    deleteRecord({ userId, language, slots }) {
      const lang = pack(language);
      const shown = displayLang(language);
      const current = repo.latestRecord(userId, slots.item || undefined);
      if (!current) {
        return {
          text: t(lang, 'deleteMissing'),
          actions: [{ type: 'tool', name: 'local_database', detail: 'No sale to delete' }],
        };
      }
      repo.deleteRecord(current.id, userId);
      const text = slots.item
        ? t(lang, 'deleted', { item: labelItem(current.item, shown) })
        : t(lang, 'deletedAny');
      return {
        text,
        actions: [{ type: 'tool', name: 'local_database', detail: `Deleted ${current.item}` }],
      };
    },

    calculate({ language, slots, userText }) {
      const lang = pack(language);
      const expression = slots.expression || userText;
      try {
        const value = evaluateExpression(expression);
        return {
          text: t(lang, 'calculated', { result: formatResult(value) }),
          actions: [{ type: 'tool', name: 'calculator', detail: expression }],
        };
      } catch {
        return {
          text: t(lang, 'calculateBad'),
          actions: [{ type: 'tool', name: 'calculator', detail: 'Rejected expression' }],
        };
      }
    },

    externalInfo({ language, slots }) {
      const lang = pack(language);
      const shown = displayLang(language);
      const topic = slots.topic || 'other';
      let text;
      if (topic === 'weather') {
        text = t(lang, 'externalWeather');
      } else if (topic === 'market') {
        const price = lookupSimulatedPrice(slots.item);
        if (!price) {
          text = t(lang, 'externalMarketMissing', {
            item: slots.item ? labelItem(slots.item, shown) : (shown === 'sw' ? 'bidhaa hiyo' : 'that item'),
          });
        } else {
          text = t(lang, 'externalMarket', {
            item: labelItem(slots.item, shown),
            amount: formatKes(price.amount),
            unit: priceUnit(price.unit, shown),
          });
        }
      } else {
        text = t(lang, 'externalOther');
      }
      return {
        text,
        actions: [{ type: 'tool', name: 'knowledge', detail: `Simulated ${topic} lookup` }],
      };
    },

    async explain(input) {
      return this.reason('explain', input);
    },

    async chat(input) {
      return this.reason('chat', input);
    },

    async reason(task, { userId, language, userText, slots }) {
      const period = slots?.period === 'all' ? 'all' : 'today';
      const records = promptRecords(repo.listRecords(userId, {
        recordedOn: period === 'all' ? undefined : todayInNairobi(),
      }));
      const response = await llm.generate({
        system: SYSTEM_PROMPT,
        prompt: buildLlmPrompt({ task, language, records, userText }),
        temperature: 0.2,
      });
      const text = String(response.text || '').trim() || t(pack(language), 'chatFallback');
      return {
        text,
        provider: response.provider,
        tier: 'qwen',
        actions: [{ type: 'tool', name: 'qwen', detail: `${response.provider}:${response.model}` }],
      };
    },

    setLanguage({ userId, slots }) {
      const next = slots.language === 'sw' ? 'sw' : 'en';
      repo.setLanguage(userId, next);
      return {
        text: t(next, 'languageSet', { language: next === 'sw' ? 'Kiswahili' : 'English' }),
        actions: [],
      };
    },
  };
}
