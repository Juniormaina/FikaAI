import { LOCAL_CONFIDENCE } from './local-model.js';
import { matchRules } from './rules.js';
import { createTools } from './tools.js';
import { chooseLanguage, detectLanguage, t } from '../i18n/language.js';

export function createOrchestrator({ repo, connectivity, llm, localModel }) {
  const tools = createTools({ repo, llm });

  return {
    /**
     * Routing uses the utterance only. The channel is delivery metadata and is
     * not read here.
     */
    async handle(message, options = {}) {
      const user = repo.ensureUser(message.userId);
      const detected = detectLanguage(message.text);
      const language = chooseLanguage(detected, user.language);
      repo.addActivity({
        userId: message.userId,
        step: 'language',
        detail: `Detected ${detected ?? 'unknown'}; replying in ${language}`,
        tier: null,
      });

      const rule = matchRules(message.text);
      let source = 'qwen';
      let intent = 'chat';
      let confidence = 0;
      let slots = {};
      if (rule) {
        source = 'rules';
        intent = rule.intent;
        confidence = rule.confidence;
        slots = rule.slots || {};
      } else {
        const local = localModel.classify(message.text);
        if (local.intent !== 'chat' && local.confidence >= LOCAL_CONFIDENCE) {
          source = 'local';
          intent = local.intent;
          confidence = local.confidence;
          slots = local.slots || {};
        } else {
          confidence = local.confidence;
        }
      }

      let tier = 'rules';
      if (intent === 'explain_records' || intent === 'chat') tier = 'qwen';
      else if (source === 'local') tier = 'local';

      const routeDetail = source === 'rules' && tier === 'qwen'
        ? `${intent} identified by rules, escalated to Qwen`
        : `${intent} via ${source} (${confidence.toFixed(2)})`;
      repo.addActivity({
        userId: message.userId,
        step: 'intent',
        detail: routeDetail,
        tier,
      });

      if (intent === 'external_info' && !(await connectivity.isOnline())) {
        if (options.fromQueue) throw new Error('Still offline');
        repo.addActivity({
          userId: message.userId,
          step: 'queue',
          detail: 'Needs external information while offline',
          tier: 'rules',
        });
        return {
          text: t(language, 'queued'),
          intent,
          tier: 'rules',
          requiresSync: true,
          actions: [{ type: 'tool', name: 'intent', detail: routeDetail }],
        };
      }

      const result = await tools.run({
        intent,
        slots,
        language,
        userId: message.userId,
        userText: message.text,
      });
      const responseTier = result.tier ?? tier;
      const toolAction = (result.actions ?? []).find((action) => action.name);
      if (toolAction) {
        repo.addActivity({
          userId: message.userId,
          step: 'tool',
          detail: `${toolAction.name}: ${toolAction.detail || ''}`.trim(),
          tier: responseTier,
        });
      }
      repo.addActivity({
        userId: message.userId,
        step: 'response',
        detail: result.provider ? `Response from ${result.provider}` : 'Channel-independent response ready',
        tier: responseTier,
      });

      return {
        text: result.text,
        intent,
        tier: responseTier,
        provider: result.provider,
        model: result.model,
        requiresSync: false,
        actions: [
          { type: 'tool', name: 'intent', detail: routeDetail },
          ...(result.actions ?? []),
        ],
      };
    },
  };
}
