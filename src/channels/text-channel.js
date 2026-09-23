import { createUserMessage } from './message.js';

export function createTextChannel(name, gateway) {
  return {
    name,
    inbound: null,
    outbound: null,
    async receive(message) {
      this.inbound = message;
    },
    async send(response) {
      this.outbound = response;
    },
    async handleTurn(userId, text) {
      const message = createUserMessage(userId, name, text);
      await this.receive(message);
      const response = await gateway.handle(message);
      await this.send(response);
      const result = { response, display: response.text };
      if (name === 'sms') {
        result.segments = Math.max(1, Math.ceil(response.text.length / 160));
      }
      return result;
    },
  };
}
