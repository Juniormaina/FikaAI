import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../env.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnvFile(path.join(root, '.env'));

const { createApp } = await import('./app.js');
const { app, config, llm } = createApp();

const server = app.listen(config.port, config.host, async () => {
  console.log(`FikaAI is running at http://${config.host}:${config.port}`);
  console.log(`LLM mode: ${config.llmProvider}`);
  console.log(`Local Ollama model: ${config.ollamaModel}`);
  console.log(`Hosted ModelScope model: ${config.modelscopeModel}`);
  console.log(`ModelScope API key configured: ${config.modelscopeApiKey ? 'yes' : 'no'}`);
  if (typeof llm.status === 'function') {
    const status = await llm.status();
    const ready = (status.providers || []).filter((item) => item.available).map((item) => item.provider);
    if (ready.length) {
      console.log(`LLM providers ready: ${ready.join(', ')}`);
    } else {
      console.warn(
        `No live LLM provider ready (${status.reason || 'unavailable'}). Rules/tools and mock fallback still work.`,
      );
    }
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
