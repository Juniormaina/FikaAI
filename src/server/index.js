import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../env.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnvFile(path.join(root, '.env'));

const { createApp } = await import('./app.js');
const { app, config, llm } = createApp();

const server = app.listen(config.port, config.host, async () => {
  console.log(`FikaAI is running at http://${config.host}:${config.port}`);
  console.log(`Configured Ollama model: ${config.ollamaModel}`);
  if (typeof llm.status === 'function') {
    const status = await llm.status();
    if (status.available) {
      console.log(`LLM provider ready: ollama (${config.ollamaModel})`);
    } else {
      console.warn(
        `LLM provider fallback: mock (${status.reason || 'ollama unavailable'}). Simple local flows still work.`,
      );
    }
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
