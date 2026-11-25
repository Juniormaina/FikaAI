import { createUserMessage } from './message.js';
import { t } from '../i18n/language.js';
import {
  POULTRY_USSD_LABELS,
  POULTRY_USSD_STAGES,
  POULTRY_USSD_TEXT,
  POULTRY_USSD_TOPICS,
} from '../guidance/poultry-ussd.js';

function poultryStageMenu(lang) {
  const labels = POULTRY_USSD_LABELS[lang];
  const lines = POULTRY_USSD_STAGES.map((id, i) => `${i + 1}. ${labels.stages[id]}`);
  return `${labels.title}\n${lines.join('\n')}\n0. ${t(lang, 'ussdBack')}\n${labels.stagePrompt}`;
}

function poultryTopicMenu(lang, stage) {
  const labels = POULTRY_USSD_LABELS[lang];
  const lines = POULTRY_USSD_TOPICS.map((id, i) => `${i + 1}. ${labels.topics[id]}`);
  return `${labels.stages[stage]}\n${lines.join('\n')}\n0. ${t(lang, 'ussdBack')}\n${labels.topicPrompt}`;
}

function screenResponse(text, intent = 'menu') {
  return { text, intent, tier: 'rules', actions: [], requiresSync: false };
}

export function createUssdChannel({ gateway, repo }) {
  const channel = {
    name: 'ussd',
    inbound: null,
    outbound: null,
    async receive(message) {
      this.inbound = message;
    },
    async send(response) {
      this.outbound = response;
    },
    async handleTurn(userId, input) {
      const user = repo.ensureUser(userId);
      const lang = user.language === 'sw' ? 'sw' : 'en';
      const session = repo.getUssdSession(userId) ?? { state: 'menu', mode: null };
      let typed = String(input ?? '').trim();
      // Dial-string shortcuts: *384*40# opens the menu, *384*40*1# jumps to option 1.
      const dial = typed.match(/^\*384\*40(?:\*(\d))?#$/);
      if (dial) typed = dial[1] ?? '';

      const finish = async (message, response, display, nextSession) => {
        await channel.receive(message);
        await channel.send(response);
        if (nextSession) repo.saveUssdSession(userId, nextSession);
        return { response, display, session: nextSession ?? session };
      };

      // Poultry guide: stages -> topics -> one short screen. 0 steps back one level.
      if (session.state === 'poultry-stages' || session.state === 'poultry-topics' || session.state === 'poultry-text') {
        const stageIndex = session.state === 'poultry-stages' ? Number(typed) - 1 : null;
        const reply = (text, nextSession) => finish(
          createUserMessage(userId, 'ussd', typed || 'poultry', { rawInput: typed }),
          screenResponse(text, 'poultry'),
          text,
          nextSession,
        );
        if (session.state === 'poultry-stages') {
          if (typed === '0') return reply(t(lang, 'ussdMenu'), { state: 'menu', mode: null });
          const stage = POULTRY_USSD_STAGES[stageIndex];
          if (stage) return reply(poultryTopicMenu(lang, stage), { state: 'poultry-topics', mode: stage });
          return reply(`${t(lang, 'ussdInvalid')}\n${poultryStageMenu(lang)}`, { state: 'poultry-stages', mode: null });
        }
        const stage = session.mode;
        if (session.state === 'poultry-topics') {
          if (typed === '0') return reply(poultryStageMenu(lang), { state: 'poultry-stages', mode: null });
          const topic = POULTRY_USSD_TOPICS[Number(typed) - 1];
          if (topic && POULTRY_USSD_STAGES.includes(stage)) {
            const body = POULTRY_USSD_TEXT[lang][stage][topic];
            return reply(`${body}\n0. ${t(lang, 'ussdBack')}`, { state: 'poultry-text', mode: stage });
          }
          return reply(`${t(lang, 'ussdInvalid')}\n${poultryTopicMenu(lang, stage)}`, { state: 'poultry-topics', mode: stage });
        }
        // poultry-text: any input goes back to the topic list for the same stage
        return reply(poultryTopicMenu(lang, stage), { state: 'poultry-topics', mode: stage });
      }

      if (typed === '5') {
        const screen = poultryStageMenu(lang);
        return finish(
          createUserMessage(userId, 'ussd', '5'),
          screenResponse(screen, 'poultry'),
          screen,
          { state: 'poultry-stages', mode: null },
        );
      }

      if (session.state === 'compose' && typed && typed !== '0') {
        const message = createUserMessage(userId, 'ussd', typed, { rawInput: typed });
        const response = await gateway.handle(message);
        const display = `${response.text}\n\n0. ${t(lang, 'ussdBack')}`;
        return finish(message, response, display, { state: 'menu', mode: null });
      }

      if (typed === '1') {
        const screen = t(lang, 'ussdAsk');
        return finish(
          createUserMessage(userId, 'ussd', '1'),
          screenResponse(screen),
          screen,
          { state: 'compose', mode: 'ask' },
        );
      }

      if (typed === '2') {
        const screen = t(lang, 'ussdRecord');
        return finish(
          createUserMessage(userId, 'ussd', '2'),
          screenResponse(screen),
          screen,
          { state: 'compose', mode: 'record' },
        );
      }

      if (typed === '3') {
        const prompt = lang === 'sw' ? 'Onyesha nilichorekodi leo.' : 'Show what I recorded today.';
        const message = createUserMessage(userId, 'ussd', prompt, { rawInput: '3' });
        const response = await gateway.handle(message);
        const display = `${response.text}\n\n0. ${t(lang, 'ussdBack')}`;
        return finish(message, response, display, { state: 'menu', mode: null });
      }

      if (typed === '4') {
        const prompt = lang === 'sw' ? 'msaada' : 'help';
        const message = createUserMessage(userId, 'ussd', prompt, { rawInput: '4' });
        const response = await gateway.handle(message);
        const display = `${response.text}\n\n0. ${t(lang, 'ussdBack')}`;
        return finish(message, response, display, { state: 'menu', mode: null });
      }

      if (typed === '' || typed === '0' || typed === '*' || /^menu$/i.test(typed)) {
        const screen = t(lang, 'ussdMenu');
        return finish(
          createUserMessage(userId, 'ussd', typed || 'menu'),
          screenResponse(screen),
          screen,
          { state: 'menu', mode: null },
        );
      }

      const screen = `${t(lang, 'ussdInvalid')}\n\n${t(lang, 'ussdMenu')}`;
      return finish(
        createUserMessage(userId, 'ussd', typed),
        screenResponse(screen),
        screen,
        { state: 'menu', mode: null },
      );
    },
  };
  return channel;
}
