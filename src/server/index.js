import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../env.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnvFile(path.join(root, '.env'));

const { createApp } = await import('./app.js');
const { app, config } = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`FikaAI is running at http://${config.host}:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
