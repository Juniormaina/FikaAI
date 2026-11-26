/**
 * FikaAI PWA — farming guidance vertical slice.
 * IndexedDB caches the saved farm plan so it stays usable with no signal.
 */

const DEMO_USER = 'demo-user';
const AUTH_KEY = 'fikaai.auth';
let userId = DEMO_USER;
let authInfo = null; // { token, userId, phoneMasked } when signed in

function loadAuth() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (saved?.token && saved?.userId) return saved;
  } catch { /* storage unavailable */ }
  return null;
}

function saveAuth(value) {
  try {
    if (value) localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    else localStorage.removeItem(AUTH_KEY);
  } catch { /* storage unavailable */ }
}

authInfo = loadAuth();
if (authInfo) userId = authInfo.userId;
const DB_NAME = 'fikaai-agri';
const DB_VERSION = 1;
const STORE = 'plan';

const state = {
  tab: 'guidance',
  mode: 'online',
  browserOnline: navigator.onLine,
  intent: null,
  queryText: '',
  advisories: [],
  selected: null,
  plan: null,
  actions: [],
  syncing: false,
  feedbackSent: false,
  advisoryCount: null,
  obsKind: 'Leaf symptom',
  swReady: false,
  poultry: null,
  poultryStage: null,
};

const $ = (sel) => document.querySelector(sel);

const CATEGORY_LABEL = {
  nutrient: 'Soil & nutrition',
  pest: 'Pest',
  disease: 'Disease',
  water: 'Water',
  planting: 'Planting',
  livestock: 'Livestock',
};

const URGENCY = {
  urgent: { label: 'Act soon', cls: 'warn' },
  advisory: { label: 'Advisory', cls: '' },
  routine: { label: 'Routine', cls: 'plain' },
};

const QUICKDIAL = [
  { menu: 1, title: 'Crop or animal problem', desc: 'Describe a symptom and get ranked guidance back.', code: '*384*40*1#' },
  { menu: 2, title: 'Record a sale', desc: 'Save a sale such as MAIZE 4500 on the device.', code: '*384*40*2#' },
  { menu: 3, title: 'View sales', desc: 'Read back what you recorded today.', code: '*384*40*3#' },
  { menu: 4, title: 'Help', desc: 'See what to type and which languages work.', code: '*384*40*4#' },
  { menu: 5, title: 'Poultry guide', desc: 'Pick a stage, then feeding, care, vaccines, housing or hygiene.', code: '*384*40*5#' },
];

/* ---------- IndexedDB ---------- */

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, value, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function cachePlanLocally() {
  if (!state.plan) return;
  await idbSet('activePlan', {
    plan: state.plan,
    actions: state.actions,
    selected: state.selected || state.plan.advisorySnapshot,
    intent: state.intent,
    queryText: state.queryText,
    feedbackSent: state.feedbackSent,
  }).catch(() => {});
}

async function restorePlanFromCache() {
  const cached = await idbGet('activePlan').catch(() => null);
  if (!cached?.plan) return false;
  state.plan = cached.plan;
  state.actions = cached.actions || [];
  state.selected = cached.selected || null;
  state.intent = cached.intent || null;
  state.queryText = cached.queryText || '';
  state.feedbackSent = Boolean(cached.feedbackSent);
  return true;
}

/* ---------- Helpers ---------- */

const API_TIMEOUT_MS = 8000;

async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...(authInfo ? { Authorization: `Bearer ${authInfo.token}` } : {}),
      },
      ...options,
      signal: controller.signal,
    });
    const isJson = (response.headers.get('content-type') || '').includes('json');
    const data = isJson ? await response.json().catch(() => ({})) : {};
    if (response.status === 401 && authInfo && !path.startsWith('/api/auth/')) {
      // Session expired or revoked: drop it and ask again.
      await finishAuthChange(null);
    }
    if (!response.ok) throw new Error(data.error || response.statusText || 'Request failed');
    // A static host can answer /api/* with an HTML page; treat that as "backend unavailable".
    if (!isJson) throw new Error('Backend unavailable');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function showNotice(text, tone = '') {
  const notice = $('#notice');
  notice.hidden = !text;
  notice.textContent = text || '';
  notice.classList.toggle('warn', tone === 'warn');
}

function smsSegments(text) {
  return Math.max(1, Math.ceil(String(text).length / 160));
}

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

function doneSteps(actions) {
  const done = new Set();
  for (const action of actions) {
    const index = action.payload?.stepIndex;
    if (!Number.isInteger(index)) continue;
    if (action.actionType === 'step_done') done.add(index);
    if (action.actionType === 'step_undone') done.delete(index);
  }
  return done;
}

function observations(actions) {
  return actions.filter((action) => action.actionType === 'observation');
}

function hasPending() {
  return Boolean(state.plan)
    && (state.plan.syncStatus === 'pending' || state.plan.syncStatus === 'failed'
      || state.actions.some((a) => a.status === 'pending'));
}

/* ---------- Status ---------- */

function setBrowserOnline(online) {
  state.browserOnline = online;
  document.body.dataset.browser = online ? 'online' : 'offline';
  $('#browser-label').textContent = online ? 'Online' : 'Offline';
  $('#offline-banner').hidden = online;
  renderTelemetry();
  renderPlan();
}

function applyBackendMode(mode) {
  state.mode = mode === 'offline' ? 'offline' : 'online';
  document.body.dataset.mode = state.mode;
  $('#btn-online').setAttribute('aria-pressed', String(state.mode === 'online'));
  $('#btn-offline').setAttribute('aria-pressed', String(state.mode === 'offline'));
}

function renderTelemetry() {
  const count = state.advisoryCount;
  const cache = state.swReady ? 'Local cache active' : 'Local cache starting';
  $('#telemetry-cache').textContent = count == null ? cache : `${cache} · ${count} advisories`;
  const sync = $('#telemetry-sync');
  if (!state.plan) {
    sync.textContent = 'No plan saved yet';
    sync.className = 'pill plain';
  } else {
    const label = state.syncing ? 'syncing' : (state.plan.syncStatus || 'synced');
    sync.textContent = `Plan: ${label}`;
    sync.className = `pill ${label === 'synced' ? '' : 'warn'}`;
  }
  $('#sync-status').hidden = !state.plan;
  $('#sync-label').textContent = state.syncing ? 'Syncing' : (state.plan?.syncStatus === 'synced' ? 'Synced' : 'Pending');
  if (count != null) {
    $('#stat-advisories').textContent = String(count);
    $('#feature-count').textContent = `${count} demo advisories`;
    $('#cache-pill-text').textContent = `${count} advisories stored on this device`;
  }
}

function showTab(name) {
  state.tab = name;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
  if (name === 'plan') renderPlan();
  if (name === 'poultry' && !state.poultry) loadPoultry();
  window.scrollTo({ top: 0 });
}

function showGuidanceView(view) {
  $('#view-search').hidden = view !== 'search';
  $('#view-advisory').hidden = view !== 'advisory';
  window.scrollTo({ top: 0 });
}


/* ---------- Poultry guide ---------- */

const POULTRY_PHOTOS = {
  hatching: { file: 'brooding-chicks', alt: 'A farmer holding a day-old chick under a brooder lamp' },
  brooding: { file: 'brooding-chicks', alt: 'Chicks resting on dry shavings under a brooder lamp' },
  growers: { file: 'free-range-homestead', alt: 'Young and growing birds foraging near a coop' },
  adults: { file: 'coop-layers', alt: 'Laying hens at the nest boxes with a basket of eggs' },
};

function stagePhotoHtml(stageId) {
  const photo = POULTRY_PHOTOS[stageId];
  if (!photo) return '';
  return `<img class="stage-photo" src="/img/${photo.file}-1280.webp" srcset="/img/${photo.file}-640.webp 640w, /img/${photo.file}-1280.webp 1280w" sizes="(min-width:1024px) 420px, 100vw" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async" />`;
}

const POULTRY_SECTIONS = [
  { key: 'feeding', title: 'Feeding' },
  { key: 'care', title: 'Care' },
  { key: 'vaccination', title: 'Vaccination', cls: 'vax' },
  { key: 'accommodation', title: 'Accommodation' },
  { key: 'hygiene', title: 'Hygiene', cls: 'hyg' },
];

async function loadPoultry() {
  // Server first, then the static copy shipped with the app, then the copy saved on this device.
  let guide = null;
  for (const path of ['/api/poultry', '/poultry-guide.json']) {
    try {
      const candidate = await api(path);
      if (candidate?.stages?.length) { guide = candidate; break; }
    } catch { /* try the next source */ }
  }
  if (guide) await idbSet('poultryGuide', guide).catch(() => {});
  else guide = await idbGet('poultryGuide').catch(() => null);
  state.poultry = guide;
  renderPoultry();
}

function renderPoultry() {
  const guide = state.poultry;
  const stagesEl = $('#poultry-stages');
  const stageEl = $('#poultry-stage');
  if (!guide?.stages?.length) {
    stagesEl.innerHTML = '';
    stageEl.innerHTML = '<div class="card"><p>The poultry guide is not on this device yet. Open this tab once while online and it will be saved for offline use.</p></div>';
    return;
  }
  if (!state.poultryStage) state.poultryStage = guide.stages[0].id;
  stagesEl.innerHTML = guide.stages.map((stage) => `
    <button type="button" class="chip" role="tab" data-poultry-stage="${escapeHtml(stage.id)}" aria-pressed="${stage.id === state.poultryStage}">
      ${escapeHtml(stage.name)}<small>${escapeHtml(stage.age)}</small>
    </button>`).join('');

  const stage = guide.stages.find((item) => item.id === state.poultryStage) || guide.stages[0];
  const sections = POULTRY_SECTIONS.map(({ key, title, cls }) => `
    <article class="card stage-card ${cls || ''}">
      <h4>${escapeHtml(title)}</h4>
      <ul>${(stage.sections[key] || []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    </article>`).join('');
  stageEl.innerHTML = `
    <div class="stage-head with-photo">
      ${stagePhotoHtml(stage.id)}
      <div class="stage-head-copy">
      <span class="stage-age">${escapeHtml(stage.age)}</span>
      <h3>${escapeHtml(stage.name)}</h3>
      <p>${escapeHtml(stage.summary)}</p>
      </div>
    </div>
    <div class="stage-grid">${sections}</div>
    <div class="watch-card">
      <h4>Watch for</h4>
      <ul>${(stage.watch_for || []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    </div>`;

  $('#poultry-vax').innerHTML = `
    <thead><tr><th>Age</th><th>Vaccine</th><th>How</th><th>Note</th></tr></thead>
    <tbody>${guide.vaccinationSchedule.map((row) => `
      <tr><td>${escapeHtml(row.age)}</td><td>${escapeHtml(row.vaccine)}</td><td>${escapeHtml(row.how)}</td><td>${escapeHtml(row.note)}</td></tr>`).join('')}</tbody>`;

  $('#poultry-vet').innerHTML = `
    <h3>Call your vet or animal health provider if you see</h3>
    <ul style="margin:0.4rem 0;padding-left:1.1rem;display:grid;gap:0.3rem">${guide.callVet.signs.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
    <p><strong>${escapeHtml(guide.callVet.note)}</strong></p>`;
  $('#poultry-disclaimer').textContent = guide.disclaimer;
}

/* ---------- Home plan preview ---------- */

function renderHomePlan() {
  const host = $('#home-plan');
  if (!state.plan) {
    host.className = 'card accent plan-preview empty-card';
    host.innerHTML = `
      <p class="eyebrow">Saved field plan</p>
      <h3>Nothing saved yet</h3>
      <p>Search for a crop problem, then choose <strong>Save to farm plan</strong>. Your checklist stays on this device and keeps working with no signal.</p>
    `;
    return;
  }
  const advisory = state.plan.advisorySnapshot || {};
  const steps = advisory.steps || [];
  const done = doneSteps(state.actions);
  const nextIndex = steps.findIndex((_, i) => !done.has(i));
  const items = steps.slice(0, 4).map((step, i) => {
    const cls = done.has(i) ? 'done' : (i === nextIndex ? 'next' : '');
    return `<li class="${cls}">${escapeHtml(step.title)}</li>`;
  }).join('');
  host.className = 'card accent plan-preview';
  host.innerHTML = `
    <div class="row">
      <p class="eyebrow">Saved field plan</p>
      <span class="pill ${state.plan.syncStatus === 'synced' ? '' : 'warn'}">${state.browserOnline ? escapeHtml(state.plan.syncStatus) : 'Offline snapshot'}</span>
    </div>
    <h3>${escapeHtml(advisory.title || 'Saved plan')}</h3>
    <p class="meta">${done.size} of ${steps.length} steps done</p>
    <ul class="steps-mini">${items}</ul>
    <button type="button" class="btn small" data-goto="plan" style="margin-top:1rem">Open full plan ${icon('arrow')}</button>
  `;
}

/* ---------- Results ---------- */

function renderIntent(result) {
  const panel = $('#intent-panel');
  if (!result?.intent) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }
  panel.hidden = false;
  const source = result.source || result.intent.source || 'unknown';
  const note = result.aiUnavailable
    ? 'AI unavailable — using deterministic fallback.'
    : `Understood via ${source}.`;
  const chips = [
    ['Crop', result.intent.crop],
    ['Region', result.intent.region],
    ['Topic', result.intent.topic],
  ].map(([label, value]) => `<span class="pill ${value ? '' : 'plain'}">${label}: ${escapeHtml(value || 'not given')}</span>`).join('');
  panel.innerHTML = `
    <div><strong>Understood query</strong> · ${escapeHtml(note)}</div>
    <div class="intent-chips">${chips}</div>
  `;
}

function stepsHtml(steps) {
  return steps.map((step) => `
    <li><div><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.detail)}</span></div></li>
  `).join('');
}

function advisoryCardHtml(advisory, { detail = false, open = false } = {}) {
  const urgency = URGENCY[advisory.urgency] || URGENCY.advisory;
  const checks = detail ? advisory.fieldChecks : advisory.fieldChecks.slice(0, 2);
  const match = advisory.matchPercent != null ? `<span class="pill warn">${advisory.matchPercent}% keyword match</span>` : '';
  const body = `
    <div class="confirm-box">
      <h4>Step-by-step field confirmation</h4>
      <ol>${stepsHtml(checks)}</ol>
    </div>
    <div class="remedy">
      <h4>Remediation guidance</h4>
      <p>${escapeHtml(advisory.remediation)}</p>
      ${advisory.caution ? `<p class="caution">${icon('alert')}<span>${escapeHtml(advisory.caution)}</span></p>` : ''}
    </div>
    <p class="meta">Guidance ID: ${escapeHtml(advisory.protocolRef)} · ${escapeHtml(advisory.dataSource)} · Updated ${escapeHtml(advisory.lastUpdatedLabel)}</p>`;
  return `
    <div class="chips-row">
      ${match}
      <span class="pill ${urgency.cls}">${urgency.label}</span>
      <span class="pill plain">${escapeHtml(CATEGORY_LABEL[advisory.category] || advisory.category)}</span>
    </div>
    <h3>${escapeHtml(advisory.title)}</h3>
    <p class="summary">${escapeHtml(advisory.summary)}</p>
    ${detail ? body : `<details class="more"${open ? ' open' : ''}><summary><span>Field checks &amp; remediation</span></summary>${body}</details>`}
  `;
}

function renderResults(advisories) {
  const host = $('#results');
  host.replaceChildren();
  $('#results-layout').hidden = false;
  $('#home-sections').hidden = true;

  if (!advisories.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'We couldn\'t find matching guidance in the demo library.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn';
    retry.textContent = 'Try another search';
    retry.addEventListener('click', () => {
      $('#guidance-input').focus();
      resetResults();
    });
    const photo = document.createElement('img');
    photo.className = 'empty-photo';
    photo.src = '/img/tomatoes-beans-640.webp';
    photo.alt = 'Hands holding tomatoes and green beans over garden soil';
    photo.loading = 'lazy';
    host.append(photo, empty, retry);
    return;
  }

  document.body.dataset.view = 'results';
  advisories.forEach((advisory, index) => {
    const card = document.createElement('article');
    card.className = `advisory-card${advisory.urgency === 'urgent' ? ' urgent' : ''}`;
    card.innerHTML = advisoryCardHtml(advisory, { open: index === 0 });

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'btn small';
    view.textContent = 'Open full guidance';
    view.addEventListener('click', () => openAdvisory(advisory));
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn primary small';
    save.textContent = 'Save to farm plan (offline)';
    save.addEventListener('click', () => {
      state.selected = advisory;
      savePlan();
    });
    const sms = document.createElement('button');
    sms.type = 'button';
    sms.className = 'btn small';
    sms.textContent = 'Preview as SMS';
    const preview = document.createElement('div');
    preview.className = 'sms-preview';
    preview.hidden = true;
    preview.innerHTML = `${escapeHtml(advisory.smsEn)}<small>${smsSegments(advisory.smsEn)} SMS · simulated</small>`;
    sms.addEventListener('click', () => { preview.hidden = !preview.hidden; });
    actions.append(save, view, sms);
    card.append(actions, preview);
    host.append(card);
  });
  requestAnimationFrame(() => {
    const target = $('#intent-panel').hidden ? $('#results-layout') : $('#intent-panel');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function resetResults() {
  delete document.body.dataset.view;
  $('#results').replaceChildren();
  $('#results-layout').hidden = true;
  $('#home-sections').hidden = false;
  $('#intent-panel').hidden = true;
  $('#hazard-panel').hidden = true;
}

function openAdvisory(advisory) {
  state.selected = advisory;
  const article = $('#advisory-detail');
  article.className = 'advisory-card' + (advisory.urgency === 'urgent' ? ' urgent' : '');
  article.innerHTML = advisoryCardHtml(advisory, { detail: true });
  showGuidanceView('advisory');
}

async function findGuidance(text) {
  const query = String(text || '').trim();
  if (!query) return;
  state.queryText = query;
  $('#hazard-panel').hidden = true;
  showNotice('Searching…');
  showGuidanceView('search');

  if (!state.browserOnline) {
    showNotice('You\'re offline. Using local fallback search when possible.', 'warn');
  }

  try {
    const result = await api('/api/guidance/search', {
      method: 'POST',
      body: JSON.stringify({ userId, text: query }),
    });

    if (result.kind === 'hazard') {
      showNotice('');
      const panel = $('#hazard-panel');
      panel.hidden = false;
      panel.innerHTML = `<strong>Safety first</strong>${escapeHtml(result.message)}`;
      $('#intent-panel').hidden = true;
      resetResults();
      $('#hazard-panel').hidden = false;
      return;
    }

    state.intent = result.intent;
    renderIntent(result);

    if (result.kind === 'clarify') {
      showNotice(result.message);
      $('#results').replaceChildren();
      $('#results-layout').hidden = true;
      return;
    }

    if (result.notice && !result.intent) showNotice(result.notice, 'warn');
    else if (result.kind === 'empty') showNotice(result.message);
    else showNotice('');

    state.advisories = result.advisories || [];
    await idbSet('lastSearch', { query, intent: result.intent, advisories: state.advisories }).catch(() => {});
    renderResults(state.advisories);
  } catch (error) {
    const cached = await idbGet('lastSearch').catch(() => null);
    if (cached?.advisories?.length) {
      showNotice('You\'re offline. Showing the last saved guidance.', 'warn');
      state.intent = cached.intent;
      state.advisories = cached.advisories;
      renderIntent({ intent: cached.intent, source: 'cache', aiUnavailable: true });
      renderResults(state.advisories);
      return;
    }
    showNotice(error.message || 'You\'re offline and this guidance hasn\'t been saved yet.', 'warn');
    resetResults();
  }
}

/* ---------- Plan ---------- */

async function savePlan() {
  if (!state.selected) return;
  try {
    const result = await api('/api/guidance/plans', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        advisoryId: state.selected.id,
        intent: state.intent,
        queryText: state.queryText,
      }),
    });
    state.plan = result.plan;
    state.actions = [];
    state.feedbackSent = false;
    await cachePlanLocally();
    showTab('plan');
    showNotice('Plan saved. Guidance is stored on this device.');
  } catch {
    // Backend unreachable: keep a local-only plan so the farmer can still work.
    const now = new Date().toISOString();
    state.plan = {
      id: `local-${Date.now()}`,
      userId,
      advisoryId: state.selected.id,
      status: 'PLAN_SAVED',
      syncStatus: 'pending',
      intent: state.intent,
      queryText: state.queryText,
      advisorySnapshot: state.selected,
      createdAt: now,
      updatedAt: now,
      localOnly: true,
    };
    state.actions = [];
    state.feedbackSent = false;
    await cachePlanLocally();
    showTab('plan');
    showNotice('Backend unavailable. Plan saved on this device and marked pending.', 'warn');
  }
  renderHomePlan();
  renderTelemetry();
}

function planSms() {
  const advisory = state.plan?.advisorySnapshot;
  if (!advisory) return '';
  const done = doneSteps(state.actions);
  const lines = (advisory.steps || []).map((step, i) => `${i + 1}${done.has(i) ? '[x]' : '[ ]'} ${step.title}`);
  return [`FikaAI plan: ${advisory.title}`, ...lines, 'Demo guidance. Confirm with extension officer.'].join('\n');
}

function renderPlan() {
  const has = Boolean(state.plan);
  $('#plan-empty').hidden = has;
  $('#plan-active').hidden = !has;
  renderHomePlan();
  renderTelemetry();
  if (!has) return;

  const advisory = state.plan.advisorySnapshot || state.selected || {};
  const steps = advisory.steps || [];
  const done = doneSteps(state.actions);
  const nextIndex = steps.findIndex((_, i) => !done.has(i));
  const sync = state.syncing ? 'Syncing' : (state.plan.syncStatus || 'synced');

  $('#plan-title').textContent = advisory.title || 'Saved plan';
  $('#plan-sub').textContent = state.plan.queryText ? `From your search: “${state.plan.queryText}”` : '';
  $('#plan-chips').innerHTML = `
    <span class="pill">${icon('cloud')} Offline ready</span>
    <span class="pill ${sync === 'synced' ? '' : 'warn'}">Sync: ${escapeHtml(String(sync))}</span>
    <span class="pill plain">${state.browserOnline ? 'Online' : 'Offline'}</span>
  `;

  $('#plan-progress-label').textContent = `${done.size} of ${steps.length} done`;
  $('#plan-progress-bar').style.width = steps.length ? `${Math.round((done.size / steps.length) * 100)}%` : '0%';

  $('#plan-steps').innerHTML = steps.map((step, i) => {
    const isDone = done.has(i);
    const cls = isDone ? 'done' : (i === nextIndex ? 'next' : '');
    return `
      <li class="step ${cls}">
        <label class="hit"><input type="checkbox" data-step="${i}" ${isDone ? 'checked' : ''} aria-label="Mark step ${i + 1} done" /></label>
        <div>
          <h4>${i + 1}. ${escapeHtml(step.title)}</h4>
          <p>${escapeHtml(step.detail)}</p>
        </div>
      </li>`;
  }).join('');

  const obs = observations(state.actions).slice().reverse();
  $('#obs-list').innerHTML = obs.length
    ? obs.map((action) => `
        <li>
          <div class="row"><span class="pill plain">${escapeHtml(action.payload?.kind || 'Note')}</span>
          <span class="meta">${escapeHtml(formatWhen(action.payload?.at || action.createdAt))} · ${action.status === 'pending' ? 'pending sync' : 'synced'}</span></div>
          <p>${escapeHtml(action.payload?.text || '')}</p>
        </li>`).join('')
    : '<li class="meta">No observations logged yet.</li>';

  const sms = planSms();
  $('#plan-sms').innerHTML = `${escapeHtml(sms)}<small>${smsSegments(sms)} SMS · simulated</small>`;
  $('#plan-ref').textContent = `${advisory.protocolRef || ''} · ${advisory.dataSource || ''}`;
  $('#offline-updated').textContent = `Guidance last updated: ${advisory.lastUpdatedLabel || advisory.lastUpdated || '—'}`;
  $('#offline-note').textContent = state.browserOnline
    ? 'Your plan is saved in this browser. Steps you tick and observations you log are queued if you lose signal.'
    : 'You\'re offline. Your plan is available and changes are saved on this device until you reconnect.';

  $('#btn-sync-plan').hidden = !(state.browserOnline && hasPending() && !state.syncing);
  $('#btn-retry-sync').hidden = !(state.plan.syncStatus === 'failed' && state.browserOnline);
  const feedback = $('#feedback-panel');
  feedback.hidden = !(state.plan.syncStatus === 'synced' && state.browserOnline);
  $('#feedback-done').hidden = !state.feedbackSent;
}

async function recordAction(actionType, payload) {
  if (!state.plan) return;
  const now = new Date().toISOString();
  const localAction = {
    id: `local-action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    planId: state.plan.id,
    actionType,
    payload,
    status: 'pending',
    createdAt: now,
  };

  const queueLocally = async () => {
    state.actions = [...state.actions, localAction];
    state.plan = { ...state.plan, syncStatus: 'pending', status: 'SYNC_PENDING', updatedAt: now };
    await cachePlanLocally();
    renderPlan();
  };

  if (!state.browserOnline || state.plan.localOnly) {
    await queueLocally();
    showNotice('Saved on this device (pending sync).', 'warn');
    return;
  }

  try {
    const result = await api(`/api/guidance/plans/${state.plan.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({ userId, actionType, payload }),
    });
    state.plan = result.plan;
    state.actions = [...state.actions, result.action];
    await cachePlanLocally();
    renderPlan();
  } catch {
    await queueLocally();
    showNotice('Backend unavailable. Saved on this device (pending sync).', 'warn');
  }
}

async function toggleStep(index, checked) {
  await recordAction(checked ? 'step_done' : 'step_undone', { stepIndex: index });
}

async function saveObservation() {
  const input = $('#obs-text');
  const text = input.value.trim();
  if (!text) {
    showNotice('Add a short note before saving.', 'warn');
    input.focus();
    return;
  }
  await recordAction('observation', { kind: state.obsKind, text, at: new Date().toISOString() });
  input.value = '';
  showNotice('Observation saved on this device.');
}

async function syncActivePlan() {
  if (!state.plan || !state.browserOnline) return;
  state.syncing = true;
  const banner = $('#sync-banner');
  banner.hidden = false;
  banner.textContent = 'Connection restored. Synchronizing your plan…';
  renderPlan();

  try {
    // A local-only plan has to be created on the server first.
    if (state.plan.localOnly) {
      const created = await api('/api/guidance/plans', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          advisoryId: state.plan.advisoryId,
          intent: state.plan.intent,
          queryText: state.plan.queryText,
        }),
      });
      state.plan = created.plan;
      for (const action of state.actions.filter((a) => a.status === 'pending')) {
        await api(`/api/guidance/plans/${state.plan.id}/actions`, {
          method: 'POST',
          body: JSON.stringify({ userId, actionType: action.actionType, payload: action.payload }),
        });
      }
    }

    const result = await api(`/api/guidance/plans/${state.plan.id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    state.plan = result.plan;
    state.actions = state.actions.map((a) => (
      a.status === 'pending' ? { ...a, status: 'synced', completedAt: new Date().toISOString() } : a
    ));
    await cachePlanLocally();
    banner.textContent = 'Synced successfully';
    showNotice('Synced successfully. Guidance refreshed where available.');
  } catch (error) {
    state.plan = { ...state.plan, syncStatus: 'failed' };
    await cachePlanLocally();
    banner.textContent = 'We couldn\'t sync your update. Your plan is safely stored on this device.';
    showNotice(error.message || 'Sync failed', 'warn');
  } finally {
    state.syncing = false;
    renderPlan();
  }
}

async function submitFeedback(rating) {
  if (!state.plan || state.feedbackSent) return;
  const comment = $('#feedback-comment').value.trim();
  try {
    await api('/api/guidance/feedback', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        planId: state.plan.localOnly ? null : state.plan.id,
        rating,
        comment: comment || null,
      }),
    });
  } catch {
    // Keep the rating locally even if the API call fails.
  }
  state.feedbackSent = true;
  state.plan = { ...state.plan, status: 'FEEDBACK' };
  await cachePlanLocally();
  await idbSet('lastFeedback', { rating, comment, at: new Date().toISOString() }).catch(() => {});
  renderPlan();
  showNotice('Feedback saved. Thank you.');
}

async function setBackendMode(mode) {
  try {
    const result = await api('/api/connectivity', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    applyBackendMode(result.mode);
    if (result.mode === 'online' && result.sync?.processed?.length) {
      showNotice(`Synced ${result.sync.processed.length} queued channel request(s).`);
    }
  } catch (error) {
    showNotice(error.message || 'Could not change the demo backend mode.', 'warn');
  }
}

/* ---------- Channels ---------- */

function appendSms(text, who) {
  const log = $('#sms-log');
  const item = document.createElement('div');
  item.className = `sms-item ${who}`;
  item.innerHTML = `<div class="who">${who === 'user' ? 'You' : 'FikaAI'}</div><div>${escapeHtml(text)}</div>`;
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

async function sendSms(text) {
  appendSms(text, 'user');
  const result = await api('/api/channels/sms', {
    method: 'POST',
    body: JSON.stringify({ userId, text }),
  });
  appendSms(result.response?.text || result.display || '', 'agent');
}

async function sendUssd(input) {
  const result = await api('/api/channels/ussd', {
    method: 'POST',
    body: JSON.stringify({ userId, input }),
  });
  $('#ussd-screen').textContent = result.display || result.response?.text || '';
}

function renderQuickDial() {
  $('#quickdial').innerHTML = QUICKDIAL.map((item) => `
    <article class="card">
      <span class="pill plain">Menu ${item.menu}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="meta">${escapeHtml(item.desc)}</p>
      <div class="code">
        <span class="dial">${escapeHtml(item.code)}</span>
        <span>
          <button type="button" data-dial="${escapeHtml(item.code)}">Dial</button>
          <button type="button" data-copy="${escapeHtml(item.code)}">Copy</button>
        </span>
      </div>
    </article>
  `).join('');
}

async function dial(code) {
  showTab('channels');
  $('#ussd-input').value = '';
  await sendUssd(code).catch((error) => showNotice(error.message, 'warn'));
}

/* ---------- Boot ---------- */

// ---- Phone sign-in (shown only when the backend offers it) ----
const authState = { enabled: false, required: false, phone: '', step: 'phone' };

function renderAuthButton() {
  const btn = $('#auth-btn');
  if (!btn) return;
  btn.hidden = !authState.enabled;
  btn.textContent = authInfo ? `Sign out · ${authInfo.phoneMasked || 'account'}` : 'Sign in';
}

async function finishAuthChange(next) {
  authInfo = next;
  userId = next ? next.userId : DEMO_USER;
  saveAuth(next);
  // Cached plans belong to whoever was signed in; do not show them to the next person.
  await Promise.all(['activePlan', 'lastSearch', 'lastFeedback'].map((key) => idbSet(key, null).catch(() => {})));
  window.location.reload();
}

function setAuthStep(step) {
  authState.step = step;
  $('#signin-step-phone').hidden = step !== 'phone';
  $('#signin-step-code').hidden = step !== 'code';
  $('#signin-submit').textContent = step === 'phone' ? 'Send code' : 'Verify';
  $('#signin-error').hidden = true;
  $(step === 'phone' ? '#signin-phone' : '#signin-code').focus();
}

function openSignIn() {
  const dialog = $('#signin');
  if (!dialog || dialog.open) return;
  $('#signin-cancel').hidden = authState.required;
  setAuthStep('phone');
  dialog.showModal();
}

async function submitSignIn(event) {
  event.preventDefault();
  const error = $('#signin-error');
  const submit = $('#signin-submit');
  error.hidden = true;
  submit.disabled = true;
  try {
    if (authState.step === 'phone') {
      authState.phone = $('#signin-phone').value;
      const result = await api('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ phone: authState.phone }) });
      const demo = $('#signin-demo');
      demo.hidden = !result.demoCode;
      demo.textContent = result.demoCode ? `Demo mode: your code is ${result.demoCode}` : '';
      setAuthStep('code');
    } else {
      const result = await api('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: authState.phone, code: $('#signin-code').value }),
      });
      $('#signin').close();
      await finishAuthChange({ token: result.token, userId: result.userId, phoneMasked: result.phoneMasked });
    }
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally {
    submit.disabled = false;
  }
}

async function initAuth() {
  try {
    // A sleeping free-tier host can take ~30s to wake, so allow longer here.
    const health = await api('/api/health', { timeoutMs: 35000 });
    authState.enabled = Boolean(health.auth?.enabled);
    authState.required = Boolean(health.auth?.required);
  } catch {
    authState.enabled = false; // static host or offline: stay in local mode
  }
  renderAuthButton();
  $('#auth-btn')?.addEventListener('click', () => (authInfo ? signOut() : openSignIn()));
  $('#signin-form')?.addEventListener('submit', submitSignIn);
  $('#signin-cancel')?.addEventListener('click', () => $('#signin').close());
  if (authState.required && !authInfo) openSignIn();
}

async function signOut() {
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch { /* already gone */ }
  await finishAuthChange(null);
}

async function bootstrap() {
  // Draw immediately from what is saved on this device; the network only refreshes it.
  await restorePlanFromCache();
  setBrowserOnline(navigator.onLine);
  renderPlan();
  initAuth(); // background: must not delay drawing the cached plan

  try {
    const data = await api(`/api/bootstrap?userId=${encodeURIComponent(userId)}`);
    applyBackendMode(data.mode);
    state.advisoryCount = data.advisoryCount;
    if (data.plan) {
      state.plan = data.plan;
      state.selected = data.plan.advisorySnapshot;
      state.intent = data.plan.intent;
      state.queryText = data.plan.queryText || '';
      try {
        const latest = await api(`/api/guidance/plans/latest?userId=${encodeURIComponent(userId)}`);
        state.actions = latest.actions || [];
      } catch {
        state.actions = [];
      }
      await cachePlanLocally();
    } else {
      await restorePlanFromCache();
    }
    await idbSet('advisoryCount', state.advisoryCount).catch(() => {});
  } catch {
    await restorePlanFromCache();
    state.advisoryCount = await idbGet('advisoryCount').catch(() => null);
    showNotice(
      authState.required && !authInfo
        ? 'Sign in with your phone number to see your plan.'
        : 'Backend unavailable. Showing the saved plan from this device if available.',
      'warn',
    );
  }

  try {
    const ussd = await api('/api/channels/ussd', {
      method: 'POST',
      body: JSON.stringify({ userId, input: '' }),
    });
    $('#ussd-screen').textContent = ussd.display || ussd.response?.text || '';
  } catch {
    $('#ussd-screen').textContent = 'USSD simulator unavailable while offline.';
  }

  renderQuickDial();
  loadPoultry();
  setBrowserOnline(navigator.onLine);
  renderPlan();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  // Poultry stage chips and the ask-a-question shortcut are rendered/handled by delegation.
  document.addEventListener('click', (event) => {
    const stageBtn = event.target.closest('[data-poultry-stage]');
    if (stageBtn) {
      state.poultryStage = stageBtn.dataset.poultryStage;
      renderPoultry();
      return;
    }
    const ask = event.target.closest('[data-poultry-ask]');
    if (ask) {
      showTab('guidance');
      showGuidanceView('search');
      $('#guidance-input').value = ask.dataset.poultryAsk;
      findGuidance(ask.dataset.poultryAsk);
    }
  });

  // Delegated: buttons rendered later (e.g. quick-dial, plan preview) use data-goto/data-dial/data-copy.
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-goto],[data-dial],[data-copy]');
    if (!target) return;
    if (target.dataset.goto) showTab(target.dataset.goto);
    if (target.dataset.dial) dial(target.dataset.dial);
    if (target.dataset.copy) {
      navigator.clipboard?.writeText(target.dataset.copy)
        .then(() => showNotice(`Copied ${target.dataset.copy}`))
        .catch(() => showNotice(target.dataset.copy));
    }
  });

  $('#btn-quick-query').addEventListener('click', () => dial('*384*40#'));

  $('#guidance-form').addEventListener('submit', (event) => {
    event.preventDefault();
    findGuidance($('#guidance-input').value);
  });

  document.querySelectorAll('[data-example]').forEach((button) => {
    button.addEventListener('click', () => {
      $('#guidance-input').value = button.dataset.example;
      findGuidance(button.dataset.example);
    });
  });

  $('#btn-back-results').addEventListener('click', () => showGuidanceView('search'));
  $('#btn-save-plan').addEventListener('click', () => savePlan());
  $('#btn-go-search').addEventListener('click', () => showTab('guidance'));
  $('#btn-sync-plan').addEventListener('click', () => syncActivePlan());
  $('#btn-retry-sync').addEventListener('click', () => syncActivePlan());
  $('#btn-save-obs').addEventListener('click', () => saveObservation());

  $('#plan-steps').addEventListener('change', (event) => {
    const box = event.target.closest('input[data-step]');
    if (box) toggleStep(Number(box.dataset.step), box.checked);
  });

  $('#obs-types').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (!chip) return;
    state.obsKind = chip.dataset.kind;
    document.querySelectorAll('#obs-types [data-kind]').forEach((el) => {
      el.setAttribute('aria-pressed', String(el === chip));
    });
  });

  document.querySelectorAll('[data-rating]').forEach((button) => {
    button.addEventListener('click', () => submitFeedback(button.dataset.rating));
  });

  $('#btn-online').addEventListener('click', () => setBackendMode('online'));
  $('#btn-offline').addEventListener('click', () => setBackendMode('offline'));

  $('#sms-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('#sms-input').value.trim();
    if (!value) return;
    $('#sms-input').value = '';
    sendSms(value).catch((error) => showNotice(error.message, 'warn'));
  });
  document.querySelectorAll('[data-sms]').forEach((button) => {
    button.addEventListener('click', () => sendSms(button.dataset.sms).catch((error) => showNotice(error.message, 'warn')));
  });

  $('#ussd-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('#ussd-input').value;
    $('#ussd-input').value = '';
    sendUssd(value).catch((error) => showNotice(error.message, 'warn'));
  });
  document.querySelectorAll('[data-ussd]').forEach((button) => {
    button.addEventListener('click', () => sendUssd(button.dataset.ussd).catch((error) => showNotice(error.message, 'warn')));
  });

  window.addEventListener('online', async () => {
    setBrowserOnline(true);
    showNotice('Connection restored');
    if (hasPending()) await syncActivePlan();
  });

  window.addEventListener('offline', () => {
    setBrowserOnline(false);
    showNotice('You\'re offline. Your saved farm plan is still available.', 'warn');
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      state.swReady = true;
      renderTelemetry();
    })
    .catch(() => {});
}

bindEvents();
bootstrap();
