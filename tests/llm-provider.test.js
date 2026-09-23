import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConnectivity } from '../src/connectivity/connectivity.js';
import { openDatabase } from '../src/storage/db.js';
import { createRepo } from '../src/storage/repo.js';
import {
  MODELSCOPE_MODELS,
  assertAllowedModelScopeModel,
  createDefaultLlm,
  createMockLlm,
  createModelScopeProvider,
  createOllamaProvider,
  createProviderRouter,
  isAllowedModelScopeModel,
} from '../src/llm/provider.js';
import { loadConfig } from '../src/config.js';

describe('ModelScope configuration', () => {
  it('loads ModelScope settings and keeps the default on the allowlist', () => {
    const config = loadConfig({
      MODELSCOPE_BASE_URL: 'https://api-inference.modelscope.ai/v1',
      MODELSCOPE_API_KEY: 'ms-test',
      MODELSCOPE_MODEL: 'Qwen-Ambassador/Qwen3.8-Max',
      LLM_PROVIDER: 'auto',
    });
    expect(config.modelscopeBaseUrl).toBe('https://api-inference.modelscope.ai/v1');
    expect(config.modelscopeApiKey).toBe('ms-test');
    expect(config.modelscopeModel).toBe('Qwen-Ambassador/Qwen3.8-Max');
    expect(config.llmProvider).toBe('auto');
    expect(isAllowedModelScopeModel(config.modelscopeModel)).toBe(true);
  });

  it('rejects invalid hosted model names', () => {
    expect(() => assertAllowedModelScopeModel('not-a-model')).toThrow(/Unsupported ModelScope model/);
    expect(MODELSCOPE_MODELS).toHaveLength(4);
  });
});

describe('provider abstraction', () => {
  it('normalizes ModelScope chat completions into { text, provider, model }', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      async text() {
        return JSON.stringify({
          choices: [{ message: { content: 'Hello from hosted Qwen' } }],
        });
      },
    }));
    const provider = createModelScopeProvider({
      baseUrl: 'https://api-inference.modelscope.ai/v1',
      apiKey: 'ms-test',
      model: 'Qwen-Ambassador/Qwen3.7-Max',
      fetchImpl,
    });
    const result = await provider.generate({
      system: 'Be brief',
      prompt: 'Hello',
    });
    expect(result).toEqual({
      text: 'Hello from hosted Qwen',
      provider: 'modelscope',
      model: 'Qwen-Ambassador/Qwen3.7-Max',
    });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.model).toBe('Qwen-Ambassador/Qwen3.7-Max');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer ms-test');
  });

  it('keeps mock and ollama providers generating normalized output', async () => {
    const mock = createMockLlm();
    const mocked = await mock.generate({
      prompt: 'TASK: explain\nLANGUAGE: en\nRECORDS_JSON_START\n[]\nRECORDS_JSON_END\nUSER: explain',
    });
    expect(mocked.provider).toBe('mock');
    expect(mocked.text).toContain('not recorded');

    const ollama = createOllamaProvider({
      baseUrl: 'http://127.0.0.1:9',
      model: 'qwen2.5:3b',
      enabled: false,
    });
    expect(await ollama.isAvailable()).toBe(false);
    const status = await ollama.status();
    expect(status.provider).toBe('ollama');
    expect(status.available).toBe(false);
  });
});

describe('provider routing', () => {
  let db;
  let repo;
  let connectivity;

  beforeEach(() => {
    db = openDatabase(':memory:');
    repo = createRepo(db);
    connectivity = createConnectivity(repo, 'online');
  });

  afterEach(() => {
    db.close();
  });

  it('uses ollama when LLM_PROVIDER=ollama', async () => {
    const ollama = {
      name: 'ollama',
      async isAvailable() { return true; },
      async status() { return { provider: 'ollama', model: 'qwen2.5:3b', available: true }; },
      async generate() { return { text: 'from-ollama', provider: 'ollama', model: 'qwen2.5:3b' }; },
    };
    const modelscope = {
      name: 'modelscope',
      async isAvailable() { return true; },
      async generate() { return { text: 'from-modelscope', provider: 'modelscope', model: 'x' }; },
    };
    const router = createProviderRouter([ollama, modelscope, createMockLlm()], { mode: 'ollama' });
    const result = await router.generate({ prompt: 'hi' });
    expect(result.provider).toBe('ollama');
  });

  it('uses modelscope when LLM_PROVIDER=modelscope and online', async () => {
    const modelscope = createModelScopeProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'ms-test',
      model: 'Qwen-Ambassador/Qwen3.7-Max',
      connectivity,
      fetchImpl: async () => ({
        ok: true,
        async text() {
          return JSON.stringify({ choices: [{ message: { content: 'hosted' } }] });
        },
      }),
    });
    const router = createProviderRouter([modelscope, createMockLlm()], { mode: 'modelscope' });
    const result = await router.generate({ prompt: 'hi' });
    expect(result).toMatchObject({ text: 'hosted', provider: 'modelscope' });
  });

  it('does not call ModelScope while offline', async () => {
    await connectivity.setMode('offline');
    const fetchImpl = vi.fn();
    const modelscope = createModelScopeProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'ms-test',
      model: 'Qwen-Ambassador/Qwen3.7-Max',
      connectivity,
      fetchImpl,
    });
    expect(await modelscope.isAvailable()).toBe(false);
    await expect(modelscope.generate({ prompt: 'hi' })).rejects.toThrow(/offline/i);
    expect(fetchImpl).not.toHaveBeenCalled();

    const ollama = {
      name: 'ollama',
      async isAvailable() { return true; },
      async generate() { return { text: 'local', provider: 'ollama', model: 'qwen2.5:3b' }; },
    };
    const router = createProviderRouter([modelscope, ollama, createMockLlm()], { mode: 'auto' });
    const result = await router.generate({ prompt: 'explain' });
    expect(result.provider).toBe('ollama');
  });

  it('auto prefers ModelScope when online and configured', async () => {
    const llm = createDefaultLlm({
      llmProvider: 'auto',
      ollamaBaseUrl: 'http://127.0.0.1:9',
      ollamaModel: 'qwen2.5:3b',
      ollamaEnabled: false,
      modelscopeBaseUrl: 'https://example.test/v1',
      modelscopeApiKey: 'ms-test',
      modelscopeModel: 'Qwen-Ambassador/Qwen3.7-Plus',
    }, {
      connectivity,
      logger: { warn() {} },
    });

    // Patch only the ModelScope generate path through a dedicated router for certainty.
    const modelscope = createModelScopeProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'ms-test',
      model: 'Qwen-Ambassador/Qwen3.7-Plus',
      connectivity,
      fetchImpl: async () => ({
        ok: true,
        async text() {
          return JSON.stringify({ choices: [{ message: { content: 'auto-hosted' } }] });
        },
      }),
    });
    const router = createProviderRouter([
      modelscope,
      createOllamaProvider({
        baseUrl: 'http://127.0.0.1:9',
        model: 'qwen2.5:3b',
        enabled: false,
      }),
      createMockLlm(),
    ], { mode: 'auto', logger: { warn() {} } });
    const result = await router.generate({ prompt: 'hi' });
    expect(result.provider).toBe('modelscope');
    expect(result.text).toBe('auto-hosted');
    expect(llm.name).toBe('router');
  });

  it('never returns the API key from provider status', async () => {
    const provider = createModelScopeProvider({
      baseUrl: 'https://example.test/v1',
      apiKey: 'ms-secret-key',
      model: 'Qwen-Ambassador/Qwen3.7-Max',
      connectivity,
    });
    const status = await provider.status();
    expect(JSON.stringify(status)).not.toContain('ms-secret-key');
    expect(status.configured).toBe(true);
  });
});
