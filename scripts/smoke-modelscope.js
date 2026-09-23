#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../src/env.js';
import { createModelScopeProvider } from '../src/llm/modelscope.js';
import {
  DEFAULT_MODELSCOPE_MODEL,
  assertAllowedModelScopeModel,
} from '../src/llm/modelscope-models.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(path.join(root, '.env'));

const apiKey = String(process.env.MODELSCOPE_API_KEY || '').trim();
if (!apiKey) {
  console.error('MODELSCOPE_API_KEY is missing. Set it in .env (never commit the key).');
  process.exit(1);
}

let model;
try {
  model = assertAllowedModelScopeModel(process.env.MODELSCOPE_MODEL || DEFAULT_MODELSCOPE_MODEL);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const provider = createModelScopeProvider({
  baseUrl: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.ai/v1',
  apiKey,
  model,
});

console.log('Running one controlled ModelScope smoke request...');
console.log(`provider=modelscope model=${model}`);

try {
  const result = await provider.generate({
    system: 'Reply in one short sentence.',
    prompt: 'Say hello from FikaAI in English only.',
    temperature: 0.2,
  });
  console.log('success=true');
  console.log(`provider=${result.provider}`);
  console.log(`model=${result.model}`);
  console.log(`text=${result.text}`);
} catch (error) {
  console.error('success=false');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
