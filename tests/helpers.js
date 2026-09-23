import { createApp } from '../src/server/app.js';
import { createMockLlm } from '../src/llm/provider.js';

export function createTestApp(overrides = {}) {
  const connectivityMode = overrides.connectivityMode ?? 'online';
  return createApp({
    databasePath: ':memory:',
    connectivityMode,
    llm: overrides.llm ?? createMockLlm(),
    config: {
      defaultUserId: 'demo-user',
      host: '127.0.0.1',
      port: 0,
      ollamaEnabled: false,
      ollamaBaseUrl: 'http://127.0.0.1:9',
      ollamaModel: 'qwen2.5:3b',
      connectivityMode,
      databasePath: ':memory:',
      root: process.cwd(),
    },
  });
}

export function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close() {
          return new Promise((done) => server.close(done));
        },
      });
    });
  });
}
