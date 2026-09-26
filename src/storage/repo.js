import crypto from 'node:crypto';

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    language: row.language,
    createdAt: row.created_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    direction: row.direction,
    text: row.text,
    intent: row.intent,
    tier: row.tier,
    provider: row.provider,
    createdAt: row.created_at,
  };
}

function mapRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    item: row.item,
    quantity: row.quantity,
    unit: row.unit,
    amountKes: row.amount_kes,
    note: row.note,
    recordedOn: row.recorded_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQueue(row) {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    text: row.text,
    reason: row.reason,
    status: row.status,
    responseText: row.response_text,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapActivity(row) {
  return {
    id: row.id,
    userId: row.user_id,
    step: row.step,
    detail: row.detail,
    tier: row.tier,
    createdAt: row.created_at,
  };
}

export function createRepo(db) {
  return {
    ensureUser(id, displayName = 'Local demo') {
      const existing = this.getUser(id);
      if (existing) return existing;
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO users (id, display_name, language, created_at) VALUES (?, ?, ?, ?)',
      ).run(id, displayName, 'en', now);
      return this.getUser(id);
    },

    getUser(id) {
      return mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    setLanguage(id, language) {
      this.ensureUser(id);
      const next = language === 'sw' ? 'sw' : 'en';
      db.prepare('UPDATE users SET language = ? WHERE id = ?').run(next, id);
      return this.getUser(id);
    },

    addMessage({ userId, channel, direction, text, intent = null, tier = null, provider = null }) {
      this.ensureUser(userId);
      const row = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      db.prepare(
        `INSERT INTO messages (id, user_id, channel, direction, text, intent, tier, provider, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(row.id, userId, channel, direction, text, intent, tier, provider, row.createdAt);
      return row;
    },

    listMessages(userId, channel) {
      if (channel) {
        return db.prepare(
          'SELECT * FROM messages WHERE user_id = ? AND channel = ? ORDER BY seq ASC',
        ).all(userId, channel).map(mapMessage);
      }
      return db.prepare(
        'SELECT * FROM messages WHERE user_id = ? ORDER BY seq ASC',
      ).all(userId).map(mapMessage);
    },

    createRecord({ userId, item, quantity = null, unit = null, amountKes, note = null, recordedOn }) {
      this.ensureUser(userId);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO records (
          id, user_id, kind, item, quantity, unit, amount_kes, note, recorded_on, created_at, updated_at
        ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, item, quantity, unit, amountKes, note, recordedOn, now, now);
      return this.getRecord(id, userId);
    },

    getRecord(id, userId) {
      return mapRecord(
        db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, userId),
      );
    },

    listRecords(userId, { recordedOn, item } = {}) {
      let sql = 'SELECT * FROM records WHERE user_id = ?';
      const params = [userId];
      if (recordedOn) {
        sql += ' AND recorded_on = ?';
        params.push(recordedOn);
      }
      if (item) {
        sql += ' AND item = ?';
        params.push(item);
      }
      sql += ' ORDER BY seq ASC';
      return db.prepare(sql).all(...params).map(mapRecord);
    },

    latestRecord(userId, item) {
      if (item) {
        return mapRecord(
          db.prepare(
            'SELECT * FROM records WHERE user_id = ? AND item = ? ORDER BY seq DESC LIMIT 1',
          ).get(userId, item),
        );
      }
      return mapRecord(
        db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY seq DESC LIMIT 1').get(userId),
      );
    },

    updateRecord(id, userId, patch) {
      const sets = [];
      const params = [];
      if (patch.amountKes !== undefined) {
        sets.push('amount_kes = ?');
        params.push(patch.amountKes);
      }
      if (patch.quantity !== undefined) {
        sets.push('quantity = ?');
        params.push(patch.quantity);
      }
      if (patch.note !== undefined) {
        sets.push('note = ?');
        params.push(patch.note);
      }
      if (!sets.length) return this.getRecord(id, userId);
      sets.push('updated_at = ?');
      params.push(new Date().toISOString(), id, userId);
      const result = db.prepare(
        `UPDATE records SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      ).run(...params);
      if (Number(result.changes) < 1) return null;
      return this.getRecord(id, userId);
    },

    deleteRecord(id, userId) {
      const result = db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, userId);
      return Number(result.changes) > 0;
    },

    enqueue({ userId, channel, text, reason }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO offline_queue (id, user_id, channel, text, reason, status, response_text, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, NULL)`,
      ).run(id, userId, channel, text, reason, createdAt);
      return { id, userId, channel, text, reason, status: 'pending', responseText: null, createdAt, completedAt: null };
    },

    listQueue(userId) {
      return db.prepare(
        'SELECT * FROM offline_queue WHERE user_id = ? ORDER BY seq DESC',
      ).all(userId).map(mapQueue);
    },

    listPendingQueue() {
      return db.prepare(
        "SELECT * FROM offline_queue WHERE status = 'pending' ORDER BY seq ASC",
      ).all().map(mapQueue);
    },

    updateQueue(id, patch) {
      const sets = [];
      const params = [];
      if (patch.status !== undefined) {
        sets.push('status = ?');
        params.push(patch.status);
      }
      if (patch.responseText !== undefined) {
        sets.push('response_text = ?');
        params.push(patch.responseText);
      }
      if (patch.completedAt !== undefined) {
        sets.push('completed_at = ?');
        params.push(patch.completedAt);
      }
      if (!sets.length) return;
      params.push(id);
      db.prepare(`UPDATE offline_queue SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    },

    getSetting(key) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row?.value ?? null;
    },

    setSetting(key, value) {
      db.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ).run(key, value);
    },

    addActivity({ userId, step, detail, tier = null }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO agent_activity (id, user_id, step, detail, tier, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, step, detail, tier, createdAt);
      return { id, userId, step, detail, tier, createdAt };
    },

    listActivity(userId, limit = 40) {
      return db.prepare(
        'SELECT * FROM agent_activity WHERE user_id = ? ORDER BY seq DESC LIMIT ?',
      ).all(userId, limit).map(mapActivity).reverse();
    },

    getUssdSession(userId) {
      const row = db.prepare('SELECT * FROM ussd_sessions WHERE user_id = ?').get(userId);
      if (!row) return null;
      return { state: row.state, mode: row.mode, updatedAt: row.updated_at };
    },

    saveUssdSession(userId, { state, mode = null }) {
      this.ensureUser(userId);
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO ussd_sessions (user_id, state, mode, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, mode = excluded.mode, updated_at = excluded.updated_at`,
      ).run(userId, state, mode, now);
    },

    clearUserData(userId) {
      db.prepare('DELETE FROM ussd_sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM agent_activity WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM offline_queue WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM records WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM feedback WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM journey_actions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM journeys WHERE user_id = ?').run(userId);
    },

    upsertProvider(provider) {
      const specialties = Array.isArray(provider.specialties)
        ? provider.specialties.join(',')
        : String(provider.specialties || '');
      db.prepare(
        `INSERT INTO providers (
          id, facility_name, facility_type, location, county, specialties, specialist_name,
          availability_status, availability_note, appointment_required, referral_required,
          contact_information, instructions, last_updated, data_source, is_demo_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          facility_name = excluded.facility_name,
          facility_type = excluded.facility_type,
          location = excluded.location,
          county = excluded.county,
          specialties = excluded.specialties,
          specialist_name = excluded.specialist_name,
          availability_status = excluded.availability_status,
          availability_note = excluded.availability_note,
          appointment_required = excluded.appointment_required,
          referral_required = excluded.referral_required,
          contact_information = excluded.contact_information,
          instructions = excluded.instructions,
          last_updated = excluded.last_updated,
          data_source = excluded.data_source,
          is_demo_data = excluded.is_demo_data`,
      ).run(
        provider.id,
        provider.facility_name,
        provider.facility_type,
        provider.location,
        provider.county,
        specialties,
        provider.specialist_name,
        provider.availability_status,
        provider.availability_note || null,
        provider.appointment_required ? 1 : 0,
        provider.referral_required ? 1 : 0,
        provider.contact_information || null,
        provider.instructions || null,
        provider.last_updated,
        provider.data_source,
        provider.is_demo_data === false ? 0 : 1,
      );
      return this.getProvider(provider.id);
    },

    countProviders() {
      const row = db.prepare('SELECT COUNT(*) AS count FROM providers').get();
      return Number(row?.count || 0);
    },

    getProvider(id) {
      return mapProvider(db.prepare('SELECT * FROM providers WHERE id = ?').get(id));
    },

    listProviders() {
      return db.prepare('SELECT * FROM providers ORDER BY facility_name ASC').all().map(mapProvider);
    },

    searchProviders({ specialty = null, location = null } = {}) {
      let sql = 'SELECT * FROM providers WHERE 1=1';
      const params = [];
      if (specialty) {
        sql += ' AND lower(specialties) LIKE ?';
        params.push(`%${String(specialty).toLowerCase()}%`);
      }
      if (location) {
        sql += ' AND (lower(county) LIKE ? OR lower(location) LIKE ?)';
        const needle = `%${String(location).toLowerCase()}%`;
        params.push(needle, needle);
      }
      sql += ' ORDER BY facility_name ASC';
      return db.prepare(sql).all(...params).map(mapProvider);
    },

    createJourney({ userId, providerId, status, syncStatus, intent, queryText, providerSnapshot }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO journeys (
          id, user_id, provider_id, status, sync_status, intent_json, query_text, provider_snapshot, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        userId,
        providerId,
        status,
        syncStatus,
        intent ? JSON.stringify(intent) : null,
        queryText || null,
        JSON.stringify(providerSnapshot),
        now,
        now,
      );
      return this.getJourney(id, userId);
    },

    getJourney(id, userId) {
      return mapJourney(
        db.prepare('SELECT * FROM journeys WHERE id = ? AND user_id = ?').get(id, userId),
      );
    },

    latestJourney(userId) {
      return mapJourney(
        db.prepare('SELECT * FROM journeys WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId),
      );
    },

    updateJourney(id, userId, patch) {
      const sets = [];
      const params = [];
      if (patch.status !== undefined) {
        sets.push('status = ?');
        params.push(patch.status);
      }
      if (patch.syncStatus !== undefined) {
        sets.push('sync_status = ?');
        params.push(patch.syncStatus);
      }
      if (patch.providerSnapshot !== undefined) {
        sets.push('provider_snapshot = ?');
        params.push(JSON.stringify(patch.providerSnapshot));
      }
      if (!sets.length) return this.getJourney(id, userId);
      sets.push('updated_at = ?');
      params.push(new Date().toISOString(), id, userId);
      db.prepare(`UPDATE journeys SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
      return this.getJourney(id, userId);
    },

    addJourneyAction({ journeyId, userId, actionType, payload, status = 'pending' }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO journey_actions (
          id, journey_id, user_id, action_type, payload_json, status, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      ).run(
        id,
        journeyId,
        userId,
        actionType,
        payload ? JSON.stringify(payload) : null,
        status,
        createdAt,
      );
      return mapJourneyAction(
        db.prepare('SELECT * FROM journey_actions WHERE id = ?').get(id),
      );
    },

    listJourneyActions(journeyId, status = null) {
      if (status) {
        return db.prepare(
          'SELECT * FROM journey_actions WHERE journey_id = ? AND status = ? ORDER BY created_at ASC',
        ).all(journeyId, status).map(mapJourneyAction);
      }
      return db.prepare(
        'SELECT * FROM journey_actions WHERE journey_id = ? ORDER BY created_at ASC',
      ).all(journeyId).map(mapJourneyAction);
    },

    updateJourneyAction(id, patch) {
      const sets = [];
      const params = [];
      if (patch.status !== undefined) {
        sets.push('status = ?');
        params.push(patch.status);
      }
      if (patch.completedAt !== undefined) {
        sets.push('completed_at = ?');
        params.push(patch.completedAt);
      }
      if (!sets.length) return;
      params.push(id);
      db.prepare(`UPDATE journey_actions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    },

    createFeedback({ userId, journeyId = null, rating, comment = null }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO feedback (id, user_id, journey_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, journeyId, rating, comment, createdAt);
      return {
        id,
        userId,
        journeyId,
        rating,
        comment,
        createdAt,
      };
    },

    listFeedback(userId) {
      return db.prepare(
        'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      ).all(userId).map((row) => ({
        id: row.id,
        userId: row.user_id,
        journeyId: row.journey_id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
      }));
    },
  };
}

function mapProvider(row) {
  if (!row) return null;
  return {
    id: row.id,
    facility_name: row.facility_name,
    facility_type: row.facility_type,
    location: row.location,
    county: row.county,
    specialties: String(row.specialties || '').split(',').map((s) => s.trim()).filter(Boolean),
    specialist_name: row.specialist_name,
    availability_status: row.availability_status,
    availability_note: row.availability_note,
    appointment_required: Boolean(row.appointment_required),
    referral_required: Boolean(row.referral_required),
    contact_information: row.contact_information,
    instructions: row.instructions,
    last_updated: row.last_updated,
    data_source: row.data_source,
    is_demo_data: Boolean(row.is_demo_data),
  };
}

function mapJourney(row) {
  if (!row) return null;
  let intent = null;
  let providerSnapshot = null;
  try {
    intent = row.intent_json ? JSON.parse(row.intent_json) : null;
  } catch {
    intent = null;
  }
  try {
    providerSnapshot = row.provider_snapshot ? JSON.parse(row.provider_snapshot) : null;
  } catch {
    providerSnapshot = null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    providerId: row.provider_id,
    status: row.status,
    syncStatus: row.sync_status,
    intent,
    queryText: row.query_text,
    providerSnapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJourneyAction(row) {
  if (!row) return null;
  let payload = null;
  try {
    payload = row.payload_json ? JSON.parse(row.payload_json) : null;
  } catch {
    payload = null;
  }
  return {
    id: row.id,
    journeyId: row.journey_id,
    userId: row.user_id,
    actionType: row.action_type,
    payload,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
