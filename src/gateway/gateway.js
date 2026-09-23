export function createGateway({ repo, agent }) {
  return {
    async handle(message) {
      repo.ensureUser(message.userId);
      repo.addMessage({
        userId: message.userId,
        channel: message.channel,
        direction: 'inbound',
        text: message.text,
      });
      const channelLabel = { web: 'a web', sms: 'an SMS', ussd: 'a USSD' }[message.channel] || 'a';
      repo.addActivity({
        userId: message.userId,
        step: 'receive',
        detail: `Gateway accepted ${channelLabel} message`,
        tier: null,
      });
      const response = await agent.handle(message);
      if (response.requiresSync) {
        const queued = repo.enqueue({
          userId: message.userId,
          channel: message.channel,
          text: message.text,
          reason: response.intent || 'external_info',
        });
        response.actions = [
          ...(response.actions ?? []),
          { type: 'queued', name: 'queue', detail: queued.id },
        ];
        repo.addActivity({
          userId: message.userId,
          step: 'queue',
          detail: `Queued until connectivity returns (${queued.id})`,
          tier: 'rules',
        });
      }
      repo.addMessage({
        userId: message.userId,
        channel: message.channel,
        direction: 'outbound',
        text: response.text,
        intent: response.intent ?? null,
        tier: response.tier ?? null,
        provider: response.provider ?? null,
      });
      return response;
    },
  };
}
