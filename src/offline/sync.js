import crypto from 'node:crypto';

export async function syncQueue({ repo, agent, connectivity }) {
  if (!(await connectivity.isOnline())) {
    return { processed: [], skipped: true };
  }
  const pending = repo.listPendingQueue();
  const processed = [];
  for (const item of pending) {
    repo.updateQueue(item.id, { status: 'processing' });
    try {
      const response = await agent.handle({
        id: crypto.randomUUID(),
        userId: item.userId,
        channel: item.channel,
        text: item.text,
        timestamp: new Date().toISOString(),
        metadata: {},
      }, { fromQueue: true });
      const completedAt = new Date().toISOString();
      repo.updateQueue(item.id, {
        status: 'completed',
        responseText: response.text,
        completedAt,
      });
      repo.addMessage({
        userId: item.userId,
        channel: item.channel,
        direction: 'outbound',
        text: response.text,
        intent: response.intent ?? null,
        tier: response.tier ?? null,
        provider: response.provider ?? null,
      });
      processed.push({
        id: item.id,
        userId: item.userId,
        channel: item.channel,
        text: item.text,
        response: response.text,
      });
    } catch (error) {
      repo.updateQueue(item.id, {
        status: 'failed',
        responseText: error instanceof Error ? error.message : 'Sync failed',
        completedAt: new Date().toISOString(),
      });
    }
  }
  return { processed, skipped: false };
}
