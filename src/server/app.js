import express from 'express';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { openDatabase } from '../storage/db.js';
import { createRepo } from '../storage/repo.js';
import { createConnectivity } from '../connectivity/connectivity.js';
import { createDefaultLlm, MODELSCOPE_MODELS, assertAllowedModelScopeModel } from '../llm/provider.js';
import { createHeuristicLocalModel } from '../agent/local-model.js';
import { createOrchestrator } from '../agent/orchestrator.js';
import { createGateway } from '../gateway/gateway.js';
import { createTextChannel } from '../channels/text-channel.js';
import { createUssdChannel } from '../channels/ussd.js';
import { syncQueue } from '../offline/sync.js';

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createApp(options = {}) {
  const config = { ...loadConfig(), ...options.config };
  if (options.databasePath) config.databasePath = options.databasePath;
  if (options.connectivityMode) config.connectivityMode = options.connectivityMode;

  const db = openDatabase(config.databasePath);
  const repo = createRepo(db);
  repo.ensureUser(config.defaultUserId, 'Local demo');
  const connectivity = createConnectivity(repo, config.connectivityMode);
  const llm = options.llm ?? createDefaultLlm(config, {
    connectivity,
    getModelScopeModel() {
      const stored = repo.getSetting('modelscope_model');
      if (stored) {
        try {
          return assertAllowedModelScopeModel(stored);
        } catch {
          // Fall through to configured default.
        }
      }
      return config.modelscopeModel;
    },
  });
  const localModel = options.localModel ?? createHeuristicLocalModel();
  const agent = createOrchestrator({ repo, connectivity, llm, localModel });
  const gateway = createGateway({ repo, agent });
  const channels = {
    web: createTextChannel('web', gateway),
    sms: createTextChannel('sms', gateway),
    ussd: createUssdChannel({ gateway, repo }),
  };

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  function readUserId(value) {
    const id = String(value || config.defaultUserId).trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw httpError(400, 'Invalid userId');
    return id;
  }

  function readText(value) {
    if (typeof value !== 'string') throw httpError(400, 'Text is required');
    const text = value.trim();
    if (!text) throw httpError(400, 'Text is required');
    if (text.length > 1000) throw httpError(400, 'Text is too long');
    return text;
  }

  app.get('/api/health', wrap(async (req, res) => {
    const llmStatus = typeof llm.status === 'function'
      ? await llm.status()
      : { provider: llm.name || 'unknown', available: false };
    const modelscopeEntry = (llmStatus.providers || []).find((item) => item.provider === 'modelscope');
    const ollamaEntry = (llmStatus.providers || []).find((item) => item.provider === 'ollama');
    res.json({
      ok: true,
      status: 'ok',
      service: 'fikaai',
      storage: 'sqlite',
      connectivity: await connectivity.getMode(),
      llm: {
        mode: config.llmProvider,
        provider: llmStatus.lastProvider && llmStatus.lastProvider !== 'startup'
          ? llmStatus.lastProvider
          : (llmStatus.provider || 'mock'),
        model: llmStatus.lastModel || llmStatus.model || null,
        available: Boolean(llmStatus.available),
        reason: llmStatus.reason || null,
        ollama: {
          model: config.ollamaModel,
          enabled: config.ollamaEnabled,
          available: Boolean(ollamaEntry?.available),
          reason: ollamaEntry?.reason || null,
        },
        modelscope: {
          configured: Boolean(config.modelscopeApiKey),
          model: repo.getSetting('modelscope_model') || config.modelscopeModel,
          available: Boolean(modelscopeEntry?.available),
          reason: modelscopeEntry?.reason || null,
        },
        providers: llmStatus.providers || null,
      },
    });
  }));

  app.get('/api/llm/models', wrap((req, res) => {
    res.json({
      provider: 'modelscope',
      models: [...MODELSCOPE_MODELS],
      configuredModel: repo.getSetting('modelscope_model') || config.modelscopeModel,
      localOllamaModel: config.ollamaModel,
      llmProviderMode: config.llmProvider,
    });
  }));

  app.post('/api/llm/model', wrap((req, res) => {
    const model = assertAllowedModelScopeModel(req.body?.model);
    repo.setSetting('modelscope_model', model);
    res.json({
      ok: true,
      configuredModel: model,
      note: 'Hosted model preference updated for this local demo. Agent logic is unchanged.',
    });
  }));

  app.get('/api/bootstrap', wrap(async (req, res) => {
    const userId = readUserId(req.query.userId);
    const user = repo.ensureUser(userId);
    res.json({
      user,
      mode: await connectivity.getMode(),
      records: repo.listRecords(userId),
      queue: repo.listQueue(userId),
      messages: repo.listMessages(userId),
      activity: repo.listActivity(userId),
      llm: {
        mode: config.llmProvider,
        modelscopeConfigured: Boolean(config.modelscopeApiKey),
        modelscopeModel: repo.getSetting('modelscope_model') || config.modelscopeModel,
        models: [...MODELSCOPE_MODELS],
        ollamaModel: config.ollamaModel,
      },
    });
  }));

  app.get('/api/connectivity', wrap(async (req, res) => {
    res.json({ mode: await connectivity.getMode() });
  }));

  app.post('/api/connectivity', wrap(async (req, res) => {
    const mode = req.body?.mode === 'offline' ? 'offline' : 'online';
    await connectivity.setMode(mode);
    const sync = mode === 'online' ? await syncQueue({ repo, agent, connectivity }) : null;
    res.json({ mode, sync });
  }));

  app.post('/api/queue/sync', wrap(async (req, res) => {
    res.json(await syncQueue({ repo, agent, connectivity }));
  }));

  app.get('/api/queue', wrap((req, res) => {
    res.json({ items: repo.listQueue(readUserId(req.query.userId)) });
  }));

  app.get('/api/records', wrap((req, res) => {
    res.json({ records: repo.listRecords(readUserId(req.query.userId)) });
  }));

  app.patch('/api/records/:id', wrap((req, res) => {
    const userId = readUserId(req.body?.userId);
    const patch = {};
    if (req.body?.amountKes !== undefined) {
      const amount = Number(req.body.amountKes);
      if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Invalid amount');
      patch.amountKes = amount;
    }
    if (req.body?.quantity !== undefined) {
      const quantity = Number(req.body.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) throw httpError(400, 'Invalid quantity');
      patch.quantity = quantity;
    }
    if (req.body?.note !== undefined) patch.note = String(req.body.note).slice(0, 200);
    const updated = repo.updateRecord(req.params.id, userId, patch);
    if (!updated) throw httpError(404, 'Record not found');
    res.json({ record: updated });
  }));

  app.delete('/api/records/:id', wrap((req, res) => {
    const userId = readUserId(req.query.userId);
    const removed = repo.deleteRecord(req.params.id, userId);
    if (!removed) throw httpError(404, 'Record not found');
    res.json({ ok: true });
  }));

  app.get('/api/messages', wrap((req, res) => {
    const userId = readUserId(req.query.userId);
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    res.json({ messages: repo.listMessages(userId, channel) });
  }));

  app.get('/api/activity', wrap((req, res) => {
    res.json({ activity: repo.listActivity(readUserId(req.query.userId)) });
  }));

  app.post('/api/language', wrap((req, res) => {
    const userId = readUserId(req.body?.userId);
    const language = req.body?.language === 'sw' ? 'sw' : 'en';
    const user = repo.setLanguage(userId, language);
    repo.saveUssdSession(userId, { state: 'menu', mode: null });
    res.json({ user });
  }));

  app.post('/api/demo-data/clear', wrap((req, res) => {
    const userId = readUserId(req.body?.userId);
    repo.clearUserData(userId);
    res.json({ ok: true });
  }));

  app.post('/api/channels/web', wrap(async (req, res) => {
    const result = await channels.web.handleTurn(readUserId(req.body?.userId), readText(req.body?.text));
    res.json(result);
  }));

  app.post('/api/channels/sms', wrap(async (req, res) => {
    const result = await channels.sms.handleTurn(readUserId(req.body?.userId), readText(req.body?.text));
    res.json(result);
  }));

  app.post('/api/channels/ussd', wrap(async (req, res) => {
    const userId = readUserId(req.body?.userId);
    const input = req.body?.input === undefined || req.body?.input === null ? '' : String(req.body.input);
    if (input.length > 1000) throw httpError(400, 'Text is too long');
    res.json(await channels.ussd.handleTurn(userId, input));
  }));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(express.static(path.join(config.root, 'public')));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: status === 500 ? 'Server error' : err.message });
  });

  return { app, db, repo, agent, gateway, channels, connectivity, config, llm };
}
