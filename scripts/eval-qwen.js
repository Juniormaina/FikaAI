#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../src/env.js';
import { createModelScopeProvider } from '../src/llm/modelscope.js';
import { MODELSCOPE_MODELS } from '../src/llm/modelscope-models.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(path.join(root, '.env'));

const apiKey = String(process.env.MODELSCOPE_API_KEY || '').trim();
if (!apiKey) {
  console.error('MODELSCOPE_API_KEY is missing. Set it in .env before running eval:qwen.');
  process.exit(1);
}

const prompt = 'In one short sentence, what is FikaAI?';
const baseUrl = process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.ai/v1';

console.log('Optional Qwen ModelScope evaluation (uses credits).');
console.log(`models=${MODELSCOPE_MODELS.length}`);

for (const model of MODELSCOPE_MODELS) {
  const provider = createModelScopeProvider({ baseUrl, apiKey, model });
  process.stdout.write(`\n[${model}] `);
  try {
    const result = await provider.generate({
      system: 'Reply briefly.',
      prompt,
      temperature: 0.2,
    });
    console.log(`ok provider=${result.provider}`);
    console.log(result.text);
  } catch (error) {
    console.log('failed');
    console.log(error instanceof Error ? error.message : error);
  }
}
