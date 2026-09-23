import { uiStrings } from './ui-strings.js';

const userId = 'demo-user';
const state = {
  lang: 'en',
  mode: 'online',
  tab: 'web',
  ussdDisplay: '',
  ussdLoaded: false,
  editing: null,
};

const $ = (selector) => document.querySelector(selector);

function s(key) {
  return uiStrings[state.lang]?.[key] ?? uiStrings.en[key] ?? '';
}

function applyChrome() {
  document.documentElement.lang = state.lang === 'sw' ? 'sw' : 'en';
  document.body.dataset.mode = state.mode;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = s(node.dataset.i18n);
    if (value) node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = s(node.dataset.i18nPlaceholder);
  });
  $('#btn-online').setAttribute('aria-pressed', String(state.mode === 'online'));
  $('#btn-offline').setAttribute('aria-pressed', String(state.mode === 'offline'));
  $('#offline-banner').hidden = state.mode !== 'offline';
  $('#language').value = state.lang;
  renderExamples();
}

function renderExamples() {
  const host = $('#examples');
  host.replaceChildren();
  const label = document.createElement('span');
  label.className = 'meta';
  label.textContent = s('examplesLabel');
  host.append(label);
  for (const example of s('examples')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = example;
    button.addEventListener('click', () => sendWeb(example));
    host.append(button);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function showNotice(text) {
  const notice = $('#notice');
  notice.hidden = !text;
  notice.textContent = text || '';
}

function showTab(name) {
  state.tab = name;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
}

function bubble(parent, message) {
  const node = document.createElement('article');
  const queued = message.direction === 'outbound' && /^(Offline:|Haupo mtandaoni)/.test(message.text);
  node.className = `bubble ${message.direction === 'inbound' ? 'user' : 'agent'}${queued ? ' queued' : ''}`;
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = message.direction === 'inbound' ? s('you') : s('agent');
  const body = document.createElement('p');
  body.textContent = message.text;
  node.append(who, body);
  if (message.direction === 'outbound' && message.tier) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = replyMeta(message);
    node.append(meta);
  }
  parent.append(node);
}

function tierLabel(tier) {
  if (tier === 'local') return s('tierLocal');
  if (tier === 'qwen') return s('tierQwen');
  if (tier === 'rules') return s('tierRules');
  return tier || '';
}

function replyMeta(message) {
  let tier = tierLabel(message.tier);
  if (message.provider === 'mock') tier = s('tierTemplate');
  if (message.provider === 'ollama') tier = s('tierQwen');
  if (message.provider === 'modelscope') tier = `${s('tierQwen')} · ModelScope`;
  return message.intent ? `${tier} · ${message.intent}` : tier;
}

function syncNotice(count) {
  if (count === 1) return s('syncedOne');
  return s('syncedMany').replace('{count}', String(count));
}

function renderMessages(messages) {
  const web = $('#web-log');
  const sms = $('#sms-log');
  web.replaceChildren();
  sms.replaceChildren();
  const webMessages = messages.filter((message) => message.channel === 'web');
  const smsMessages = messages.filter((message) => message.channel === 'sms');
  if (!webMessages.length) web.append(empty(s('emptyChat')));
  if (!smsMessages.length) sms.append(empty(s('emptySms')));
  for (const message of webMessages) bubble(web, message);
  for (const message of smsMessages) {
    const item = document.createElement('div');
    item.className = `sms-item ${message.direction === 'inbound' ? 'user' : 'agent'}`;
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = message.direction === 'inbound' ? s('userLabel') : 'FikaAI';
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = message.text;
    item.append(who, body);
    if (message.direction === 'outbound') {
      const meta = document.createElement('div');
      meta.className = 'sms-meta';
      const count = Math.max(1, Math.ceil(message.text.length / 160));
      meta.textContent = s('segments').replace('{count}', String(count));
      item.append(meta);
    }
    sms.append(item);
  }
}

function empty(text) {
  const node = document.createElement('p');
  node.className = 'empty';
  node.textContent = text;
  return node;
}

function renderActivity(activity) {
  const list = $('#activity-list');
  list.replaceChildren();
  if (!activity.length) {
    const item = document.createElement('li');
    item.append(empty(s('emptyActivity')));
    list.append(item);
    return;
  }
  for (const entry of activity) {
    const item = document.createElement('li');
    item.className = 'card';
    const top = document.createElement('div');
    const pill = document.createElement('span');
    pill.className = `pill ${entry.tier || ''}`;
    pill.textContent = entry.step;
    top.append(pill);
    if (entry.tier) {
      const tier = document.createElement('span');
      tier.className = 'meta';
      tier.textContent = ` ${tierLabel(entry.tier)}`;
      top.append(tier);
    }
    const detail = document.createElement('p');
    detail.textContent = entry.detail;
    item.append(top, detail);
    list.append(item);
  }
}

function renderQueue(items) {
  const list = $('#queue-list');
  list.replaceChildren();
  if (!items.length) {
    list.append(empty(s('emptyQueue')));
    return;
  }
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card';
    const status = document.createElement('div');
    const pill = document.createElement('span');
    pill.className = `pill ${item.status}`;
    pill.textContent = s(item.status) || item.status;
    status.append(pill);
    const request = document.createElement('p');
    request.textContent = item.text;
    card.append(status, request);
    if (item.responseText) {
      const reply = document.createElement('p');
      reply.textContent = item.responseText;
      card.append(reply);
    }
    list.append(card);
  }
}

function renderData(records) {
  const body = $('#data-body');
  body.replaceChildren();
  if (!records.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.append(empty(s('emptyData')));
    row.append(cell);
    body.append(row);
    return;
  }
  for (const record of records) {
    const row = document.createElement('tr');
    const item = document.createElement('td');
    item.textContent = record.item;
    const quantity = document.createElement('td');
    quantity.textContent = record.quantity == null ? '' : `${record.quantity} ${record.unit || ''}`.trim();
    const amount = document.createElement('td');
    const date = document.createElement('td');
    date.textContent = record.recordedOn;
    const actions = document.createElement('td');
    if (state.editing === record.id) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.value = String(record.amountKes);
      input.id = `edit-${record.id}`;
      amount.append(input);
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'mini';
      save.textContent = s('save');
      save.addEventListener('click', () => saveRecord(record.id, input.value));
      actions.append(save);
    } else {
      amount.textContent = formatAmount(record.amountKes);
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'mini';
      edit.textContent = s('edit');
      edit.addEventListener('click', () => {
        state.editing = record.id;
        renderData(records);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mini';
      remove.textContent = s('delete');
      remove.addEventListener('click', () => removeRecord(record.id));
      actions.append(edit, remove);
    }
    row.append(item, quantity, amount, date, actions);
    body.append(row);
  }
}

function formatAmount(amount) {
  const rounded = Number.isInteger(Number(amount)) ? Number(amount) : Number(amount);
  return `KSh ${rounded.toLocaleString('en-KE')}`;
}

function renderHostedModel(llm) {
  const field = $('#hosted-model-field');
  const select = $('#hosted-model');
  if (!field || !select) return;
  const show = Boolean(llm?.modelscopeConfigured);
  field.hidden = !show;
  if (!show) return;
  const models = llm.models || [];
  const current = llm.modelscopeModel || models[0] || '';
  select.replaceChildren();
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model.replace('Qwen-Ambassador/', '');
    if (model === current) option.selected = true;
    select.append(option);
  }
  select.title = s('hostedModelHint');
}

function renderAll(data) {
  state.mode = data.mode;
  state.lang = data.user.language === 'sw' ? 'sw' : state.lang;
  if (data.user.language === 'sw' || data.user.language === 'en') {
    state.lang = data.user.language;
  }
  applyChrome();
  renderHostedModel(data.llm);
  renderMessages(data.messages || []);
  renderActivity(data.activity || []);
  renderQueue(data.queue || []);
  renderData(data.records || []);
  if (state.ussdDisplay) $('#ussd-screen').textContent = state.ussdDisplay;
}

async function refresh() {
  const data = await api(`/api/bootstrap?userId=${encodeURIComponent(userId)}`);
  renderAll(data);
  return data;
}

async function sendWeb(text) {
  const value = text.trim();
  if (!value) return;
  $('#web-input').value = '';
  await api('/api/channels/web', {
    method: 'POST',
    body: JSON.stringify({ userId, text: value }),
  });
  await refresh();
}

async function loadUssd() {
  const result = await api('/api/channels/ussd', {
    method: 'POST',
    body: JSON.stringify({ userId, input: '' }),
  });
  state.ussdDisplay = result.display;
  state.ussdLoaded = true;
  $('#ussd-screen').textContent = result.display;
}

async function saveRecord(id, value) {
  await api(`/api/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, amountKes: Number(value) }),
  });
  state.editing = null;
  await refresh();
}

async function removeRecord(id) {
  await api(`/api/records/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await refresh();
}

document.querySelectorAll('[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
});

$('#web-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await sendWeb($('#web-input').value);
  } catch (error) {
    showNotice(error.message);
  }
});

$('#sms-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = $('#sms-input').value.trim();
  if (!text) return;
  $('#sms-input').value = '';
  try {
    await api('/api/channels/sms', {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    });
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

$('#ussd-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#ussd-input').value;
  $('#ussd-input').value = '';
  try {
    const result = await api('/api/channels/ussd', {
      method: 'POST',
      body: JSON.stringify({ userId, input }),
    });
    state.ussdDisplay = result.display;
    $('#ussd-screen').textContent = result.display;
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

async function setMode(mode) {
  const data = await api('/api/connectivity', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  const count = data.sync?.processed?.length || 0;
  showNotice(count ? syncNotice(count) : '');
  await refresh();
}

$('#btn-online').addEventListener('click', () => setMode('online').catch((error) => showNotice(error.message)));
$('#btn-offline').addEventListener('click', () => setMode('offline').catch((error) => showNotice(error.message)));

$('#btn-sync').addEventListener('click', async () => {
  try {
    const data = await api('/api/queue/sync', { method: 'POST', body: '{}' });
    const count = data.processed?.length || 0;
    showNotice(data.skipped ? s('offlineBanner') : (count ? syncNotice(count) : ''));
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

$('#language').addEventListener('change', async (event) => {
  try {
    await api('/api/language', {
      method: 'POST',
      body: JSON.stringify({ userId, language: event.target.value }),
    });
    state.lang = event.target.value === 'sw' ? 'sw' : 'en';
    await loadUssd();
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

$('#hosted-model')?.addEventListener('change', async (event) => {
  try {
    await api('/api/llm/model', {
      method: 'POST',
      body: JSON.stringify({ model: event.target.value }),
    });
    showNotice(s('hostedModelHint'));
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

$('#btn-clear').addEventListener('click', async () => {
  try {
    await api('/api/demo-data/clear', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    state.editing = null;
    await loadUssd();
    await refresh();
  } catch (error) {
    showNotice(error.message);
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

applyChrome();
refresh()
  .then(loadUssd)
  .catch((error) => showNotice(error.message));
