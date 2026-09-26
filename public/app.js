/**
 * FikaAI PWA — healthcare access vertical slice.
 * IndexedDB caches journey state for true offline continuity.
 */

const userId = 'demo-user';
const DB_NAME = 'fikaai-care';
const DB_VERSION = 1;
const STORE = 'journey';

const state = {
  tab: 'care',
  mode: 'online',
  browserOnline: navigator.onLine,
  intent: null,
  queryText: '',
  providers: [],
  selectedProvider: null,
  journey: null,
  actions: [],
  syncing: false,
  feedbackSent: false,
};

const $ = (sel) => document.querySelector(sel);

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

async function cacheJourneyLocally() {
  if (!state.journey) return;
  await idbSet('activeJourney', {
    journey: state.journey,
    actions: state.actions,
    selectedProvider: state.selectedProvider || state.journey.providerSnapshot,
    intent: state.intent,
    queryText: state.queryText,
    feedbackSent: state.feedbackSent,
  });
}

async function restoreJourneyFromCache() {
  const cached = await idbGet('activeJourney');
  if (!cached?.journey) return false;
  state.journey = cached.journey;
  state.actions = cached.actions || [];
  state.selectedProvider = cached.selectedProvider || null;
  state.intent = cached.intent || null;
  state.queryText = cached.queryText || '';
  state.feedbackSent = Boolean(cached.feedbackSent);
  return true;
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

function setBrowserOnline(online) {
  state.browserOnline = online;
  document.body.dataset.browser = online ? 'online' : 'offline';
  $('#browser-label').textContent = online ? 'Online' : 'Offline';
  $('#offline-banner').hidden = online;
  $('#offline-box').hidden = online || !state.journey;
  renderJourneyMeta();
  updateSyncControls();
}

function applyBackendMode(mode) {
  state.mode = mode === 'offline' ? 'offline' : 'online';
  document.body.dataset.mode = state.mode;
  $('#btn-online').setAttribute('aria-pressed', String(state.mode === 'online'));
  $('#btn-offline').setAttribute('aria-pressed', String(state.mode === 'offline'));
}

function showTab(name) {
  state.tab = name;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
  if (name === 'journey') renderJourney();
}

function showCareView(view) {
  $('#view-search').hidden = view !== 'search';
  $('#view-facility').hidden = view !== 'facility';
}

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
    ? 'AI unavailable — using deterministic fallback intent.'
    : `Intent extracted via ${source}.`;
  panel.innerHTML = `
    <div><strong>Understood need</strong> · ${note}</div>
    <code>${JSON.stringify({
      specialty: result.intent.specialty,
      location: result.intent.location,
      request_type: result.intent.request_type,
      urgency: result.intent.urgency,
      confidence: result.intent.confidence,
    }, null, 2)}</code>
  `;
}

function providerCardHtml(provider, { detail = false } = {}) {
  const specialty = (provider.specialties || []).join(', ') || 'General';
  return `
    <h3>${escapeHtml(provider.facilityName)}</h3>
    <div class="spec">${escapeHtml(specialty)}</div>
    <p class="meta">${escapeHtml(provider.location)} · ${escapeHtml(provider.facilityType || '')}</p>
    <dl>
      <dt>Specialist</dt><dd>${escapeHtml(provider.specialistName)}</dd>
      <dt>Availability</dt><dd>${escapeHtml(provider.availabilityStatus)}</dd>
      <dt>Appointment</dt><dd>${provider.appointmentRequired ? 'Required' : 'Not required'}</dd>
      <dt>Referral</dt><dd>${provider.referralRequired ? 'Required' : 'Not required'}</dd>
      <dt>Last updated</dt><dd>${escapeHtml(provider.lastUpdatedLabel || provider.lastUpdated)}</dd>
    </dl>
    ${detail && provider.availabilityNote ? `<p class="meta">${escapeHtml(provider.availabilityNote)}</p>` : ''}
    ${detail && provider.instructions ? `<p><strong>Instructions:</strong> ${escapeHtml(provider.instructions)}</p>` : ''}
    ${detail && provider.contactInformation ? `<p class="meta">${escapeHtml(provider.contactInformation)}</p>` : ''}
    <span class="demo-badge">Demo data</span>
    ${detail ? `<div class="warning">${escapeHtml(provider.dataSource || 'Synthetic provider data — for demonstration only')}</div>` : ''}
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderResults(providers) {
  const host = $('#results');
  host.replaceChildren();
  if (!providers.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'We couldn\'t find a matching provider in the demo directory.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Try another search';
    retry.addEventListener('click', () => {
      $('#care-input').focus();
      host.replaceChildren();
      $('#intent-panel').hidden = true;
    });
    host.append(empty, retry);
    return;
  }
  for (const provider of providers) {
    const card = document.createElement('article');
    card.className = 'provider-card';
    card.innerHTML = providerCardHtml(provider);
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'primary';
    cta.textContent = 'View facility';
    cta.addEventListener('click', () => openFacility(provider));
    card.append(cta);
    host.append(card);
  }
}

function openFacility(provider) {
  state.selectedProvider = provider;
  $('#facility-detail').innerHTML = providerCardHtml(provider, { detail: true });
  showCareView('facility');
}

async function findCare(text) {
  const query = String(text || '').trim();
  if (!query) return;
  state.queryText = query;
  $('#emergency-panel').hidden = true;
  showNotice('Searching…');
  showCareView('search');

  // Offline with no network: try cached providers from last search if specialty matches,
  // otherwise explain limitation.
  if (!state.browserOnline) {
    showNotice('You\'re offline. Using local fallback search when possible.');
  }

  try {
    const result = await api('/api/care/search', {
      method: 'POST',
      body: JSON.stringify({ userId, text: query }),
    });

    if (result.kind === 'emergency') {
      showNotice('');
      const panel = $('#emergency-panel');
      panel.hidden = false;
      panel.textContent = result.message;
      $('#intent-panel').hidden = true;
      $('#results').replaceChildren();
      return;
    }

    state.intent = result.intent;
    renderIntent(result);

    if (result.kind === 'clarify') {
      showNotice(result.message);
      $('#results').replaceChildren();
      return;
    }

    if (result.notice) showNotice(result.notice);
    else if (result.kind === 'empty') showNotice(result.message);
    else showNotice('');

    state.providers = result.providers || [];
    await idbSet('lastSearch', { query, intent: result.intent, providers: state.providers });
    renderResults(state.providers);
  } catch (error) {
    // Network failure: fall back to cached search results if available.
    const cached = await idbGet('lastSearch');
    if (cached?.providers?.length) {
      showNotice('You\'re offline. Showing saved information.');
      state.intent = cached.intent;
      state.providers = cached.providers;
      renderIntent({ intent: cached.intent, source: 'cache', aiUnavailable: true });
      renderResults(state.providers);
      return;
    }
    showNotice(error.message || 'You\'re offline and this information hasn\'t been saved yet.');
    $('#results').replaceChildren();
  }
}

async function startJourney() {
  if (!state.selectedProvider) return;
  try {
    const result = await api('/api/care/journeys', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        providerId: state.selectedProvider.id,
        intent: state.intent,
        queryText: state.queryText,
      }),
    });
    state.journey = result.journey;
    state.actions = [];
    state.feedbackSent = false;
    await cacheJourneyLocally();
    showTab('journey');
    showNotice('Journey started. Provider information saved on this device.');
  } catch (error) {
    // If backend unreachable, still create a local-only journey for demo continuity.
    const localJourney = {
      id: `local-${Date.now()}`,
      userId,
      providerId: state.selectedProvider.id,
      status: 'JOURNEY_STARTED',
      syncStatus: 'pending',
      intent: state.intent,
      queryText: state.queryText,
      providerSnapshot: state.selectedProvider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localOnly: true,
    };
    state.journey = localJourney;
    state.actions = [];
    state.feedbackSent = false;
    await cacheJourneyLocally();
    showTab('journey');
    showNotice('Backend unavailable. Journey saved on this device and marked pending.');
  }
}

function renderJourneyMeta() {
  const meta = $('#journey-meta');
  if (!state.journey) {
    meta.replaceChildren();
    return;
  }
  const provider = state.journey.providerSnapshot || state.selectedProvider || {};
  const connection = state.browserOnline ? 'Online' : 'Offline';
  const sync = state.syncing ? 'Syncing' : (state.journey.syncStatus || 'synced');
  meta.innerHTML = `
    <div><strong>Facility:</strong> ${escapeHtml(provider.facilityName || 'Saved facility')}</div>
    <div><strong>Specialist:</strong> ${escapeHtml(provider.specialistName || '—')}</div>
    <div><strong>Connection:</strong> ${connection}</div>
    <div><strong>Journey sync:</strong> ${escapeHtml(String(sync))}</div>
    <div><strong>Last provider update:</strong> ${escapeHtml(provider.lastUpdatedLabel || provider.lastUpdated || '—')}</div>
    <span class="demo-badge">Cached / demo data</span>
  `;
  $('#offline-updated').textContent = `Last provider update: ${provider.lastUpdatedLabel || provider.lastUpdated || '—'}`;
  $('#sync-status').hidden = false;
  $('#sync-label').textContent = `Journey: ${sync}`;
}

function updateSyncControls() {
  const hasPending = state.journey
    && (state.journey.syncStatus === 'pending' || state.journey.syncStatus === 'failed'
      || state.actions.some((a) => a.status === 'pending'));
  $('#btn-sync-journey').hidden = !(state.browserOnline && hasPending && !state.syncing);
  $('#btn-retry-sync').hidden = !(state.journey?.syncStatus === 'failed');
  const feedback = $('#feedback-panel');
  feedback.hidden = !(state.journey && state.journey.syncStatus === 'synced' && state.browserOnline);
  if (state.feedbackSent) {
    $('#feedback-done').hidden = false;
  }
}

function renderJourney() {
  const has = Boolean(state.journey);
  $('#journey-empty').hidden = has;
  $('#journey-active').hidden = !has;
  if (!has) return;
  renderJourneyMeta();
  $('#offline-box').hidden = state.browserOnline;
  updateSyncControls();
}

async function saveOfflineNote() {
  if (!state.journey) return;
  const note = {
    text: 'Reviewed facility requirements while offline',
    at: new Date().toISOString(),
  };

  if (!state.browserOnline || state.journey.localOnly) {
    const action = {
      id: `local-action-${Date.now()}`,
      journeyId: state.journey.id,
      actionType: 'offline_note',
      payload: note,
      status: 'pending',
      createdAt: note.at,
    };
    state.actions = [...state.actions, action];
    state.journey = {
      ...state.journey,
      syncStatus: 'pending',
      status: 'SYNC_PENDING',
      updatedAt: note.at,
    };
    await cacheJourneyLocally();
    showNotice('Offline note saved on this device (pending sync).');
    renderJourney();
    return;
  }

  try {
    const result = await api(`/api/care/journeys/${state.journey.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        actionType: 'offline_note',
        payload: note,
      }),
    });
    state.journey = result.journey;
    state.actions = [...state.actions, result.action];
    await cacheJourneyLocally();
    showNotice('Note saved. Sync status: pending.');
    renderJourney();
  } catch (error) {
    showNotice(error.message || 'Could not save note');
  }
}

async function syncActiveJourney() {
  if (!state.journey || !state.browserOnline) return;
  state.syncing = true;
  const banner = $('#sync-banner');
  banner.hidden = false;
  banner.textContent = 'Connection restored. Synchronizing your journey…';
  renderJourneyMeta();
  updateSyncControls();

  try {
    // If journey was local-only, create it on the server first.
    if (state.journey.localOnly) {
      const created = await api('/api/care/journeys', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          providerId: state.journey.providerId,
          intent: state.journey.intent,
          queryText: state.journey.queryText,
        }),
      });
      const oldId = state.journey.id;
      state.journey = created.journey;
      // Replay pending local actions
      for (const action of state.actions.filter((a) => a.status === 'pending')) {
        await api(`/api/care/journeys/${state.journey.id}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            userId,
            actionType: action.actionType,
            payload: action.payload,
          }),
        });
      }
      void oldId;
    }

    const result = await api(`/api/care/journeys/${state.journey.id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    state.journey = result.journey;
    state.actions = state.actions.map((a) => (
      a.status === 'pending' ? { ...a, status: 'synced', completedAt: new Date().toISOString() } : a
    ));
    await cacheJourneyLocally();
    banner.textContent = 'Synced successfully';
    showNotice('Synced successfully. Provider information refreshed where available.');
  } catch (error) {
    state.journey = {
      ...state.journey,
      syncStatus: 'failed',
    };
    await cacheJourneyLocally();
    banner.textContent = 'We couldn\'t sync your update. Your journey is safely stored on this device.';
    showNotice(error.message || 'Sync failed');
  } finally {
    state.syncing = false;
    renderJourney();
  }
}

async function submitFeedback(rating) {
  if (!state.journey || state.feedbackSent) return;
  const comment = $('#feedback-comment').value.trim();
  try {
    await api('/api/care/feedback', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        journeyId: state.journey.localOnly ? null : state.journey.id,
        rating,
        comment: comment || null,
      }),
    });
  } catch {
    // Persist feedback intent locally even if API fails.
  }
  state.feedbackSent = true;
  state.journey = { ...state.journey, status: 'FEEDBACK' };
  await cacheJourneyLocally();
  await idbSet('lastFeedback', { rating, comment, at: new Date().toISOString() });
  $('#feedback-done').hidden = false;
  showNotice('Feedback saved. Thank you.');
}

async function setBackendMode(mode) {
  const result = await api('/api/connectivity', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  applyBackendMode(result.mode);
  if (result.mode === 'online' && result.sync?.processed?.length) {
    showNotice(`Synced ${result.sync.processed.length} queued channel request(s).`);
  }
}

async function sendSms(text) {
  const result = await api('/api/channels/sms', {
    method: 'POST',
    body: JSON.stringify({ userId, text }),
  });
  appendSms(text, 'user');
  appendSms(result.text, 'agent');
}

function appendSms(text, who) {
  const log = $('#sms-log');
  const item = document.createElement('div');
  item.className = `sms-item ${who}`;
  item.innerHTML = `<div class="who">${who === 'user' ? 'You' : 'FikaAI'}</div><div>${escapeHtml(text)}</div>`;
  log.append(item);
  log.scrollTop = log.scrollHeight;
}

async function sendUssd(input) {
  const result = await api('/api/channels/ussd', {
    method: 'POST',
    body: JSON.stringify({ userId, input }),
  });
  $('#ussd-screen').textContent = result.display || result.text || '';
}

async function bootstrap() {
  try {
    const data = await api(`/api/bootstrap?userId=${encodeURIComponent(userId)}`);
    applyBackendMode(data.mode);
    if (data.journey) {
      state.journey = data.journey;
      state.selectedProvider = data.journey.providerSnapshot;
      state.intent = data.journey.intent;
      state.queryText = data.journey.queryText || '';
      await cacheJourneyLocally();
    } else {
      await restoreJourneyFromCache();
    }
  } catch {
    await restoreJourneyFromCache();
    showNotice('Backend unavailable. Showing saved journey from this device if available.');
  }

  try {
    const ussd = await api('/api/channels/ussd', {
      method: 'POST',
      body: JSON.stringify({ userId, input: '' }),
    });
    $('#ussd-screen').textContent = ussd.display || ussd.text || '';
  } catch {
    $('#ussd-screen').textContent = 'USSD simulator unavailable while offline.';
  }

  setBrowserOnline(navigator.onLine);
  renderJourney();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  $('#care-form').addEventListener('submit', (event) => {
    event.preventDefault();
    findCare($('#care-input').value);
  });

  document.querySelectorAll('[data-example]').forEach((button) => {
    button.addEventListener('click', () => {
      $('#care-input').value = button.dataset.example;
      findCare(button.dataset.example);
    });
  });

  $('#btn-back-results').addEventListener('click', () => showCareView('search'));
  $('#btn-start-journey').addEventListener('click', () => startJourney());
  $('#btn-go-search').addEventListener('click', () => showTab('care'));
  $('#btn-offline-action').addEventListener('click', () => saveOfflineNote());
  $('#btn-sync-journey').addEventListener('click', () => syncActiveJourney());
  $('#btn-retry-sync').addEventListener('click', () => syncActiveJourney());

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
    sendSms(value).catch((error) => showNotice(error.message));
  });

  $('#ussd-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('#ussd-input').value;
    $('#ussd-input').value = '';
    sendUssd(value).catch((error) => showNotice(error.message));
  });

  window.addEventListener('online', async () => {
    setBrowserOnline(true);
    showNotice('Connection restored');
    if (state.journey && (state.journey.syncStatus === 'pending' || state.journey.syncStatus === 'failed'
      || state.actions.some((a) => a.status === 'pending'))) {
      await syncActiveJourney();
    }
  });

  window.addEventListener('offline', () => {
    setBrowserOnline(false);
    showNotice('You\'re offline. Your saved healthcare journey is still available.');
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

bindEvents();
bootstrap();
