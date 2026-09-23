import { createUserMessage } from './message.js';
import { t } from '../i18n/language.js';

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
      const typed = String(input ?? '').trim();

      const finish = async (message, response, display, nextSession) => {
        await channel.receive(message);
        await channel.send(response);
        if (nextSession) repo.saveUssdSession(userId, nextSession);
        return { response, display, session: nextSession ?? session };
      };

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
