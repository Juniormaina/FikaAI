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
      db.prepare('DELETE FROM guidance_feedback WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM plan_actions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM farm_plans WHERE user_id = ?').run(userId);
    },

    upsertAdvisory(advisory) {
      db.prepare(
        `INSERT INTO advisories (
          id, title, category, crops, regions, urgency, summary, symptoms, field_checks,
          remediation, caution, protocol_ref, sms_en, sms_sw, last_updated, data_source, is_demo_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          crops = excluded.crops,
          regions = excluded.regions,
          urgency = excluded.urgency,
          summary = excluded.summary,
          symptoms = excluded.symptoms,
          field_checks = excluded.field_checks,
          remediation = excluded.remediation,
          caution = excluded.caution,
          protocol_ref = excluded.protocol_ref,
          sms_en = excluded.sms_en,
          sms_sw = excluded.sms_sw,
          last_updated = excluded.last_updated,
          data_source = excluded.data_source,
          is_demo_data = excluded.is_demo_data`,
      ).run(
        advisory.id,
        advisory.title,
        advisory.category,
        JSON.stringify(advisory.crops || []),
        JSON.stringify(advisory.regions || []),
        advisory.urgency,
        advisory.summary,
        JSON.stringify(advisory.symptoms || []),
        JSON.stringify(advisory.field_checks || []),
        advisory.remediation,
        advisory.caution || null,
        advisory.protocol_ref || null,
        advisory.sms_en || null,
        advisory.sms_sw || null,
        advisory.last_updated,
        advisory.data_source,
        advisory.is_demo_data === false ? 0 : 1,
      );
      return this.getAdvisory(advisory.id);
    },

    countAdvisories() {
      const row = db.prepare('SELECT COUNT(*) AS count FROM advisories').get();
      return Number(row?.count || 0);
    },

    getAdvisory(id) {
      return mapAdvisory(db.prepare('SELECT * FROM advisories WHERE id = ?').get(id));
    },

    listAdvisories() {
      return db.prepare('SELECT * FROM advisories ORDER BY title ASC').all().map(mapAdvisory);
    },

    searchAdvisories({ crop = null } = {}) {
      let sql = 'SELECT * FROM advisories WHERE 1=1';
      const params = [];
      if (crop) {
        // crops is a JSON array of lowercase names, e.g. ["maize","beans"].
        sql += ' AND lower(crops) LIKE ?';
        params.push(`%"${String(crop).toLowerCase()}"%`);
      }
      sql += ' ORDER BY title ASC';
      return db.prepare(sql).all(...params).map(mapAdvisory);
    },

    clearAdvisories() {
      db.prepare('DELETE FROM advisories').run();
    },

    createPlan({ userId, advisoryId, status, syncStatus, intent, queryText, advisorySnapshot }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO farm_plans (
          id, user_id, advisory_id, status, sync_status, intent_json, query_text, advisory_snapshot, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        userId,
        advisoryId,
        status,
        syncStatus,
        intent ? JSON.stringify(intent) : null,
        queryText || null,
        JSON.stringify(advisorySnapshot),
        now,
        now,
      );
      return this.getPlan(id, userId);
    },

    getPlan(id, userId) {
      return mapPlan(
        db.prepare('SELECT * FROM farm_plans WHERE id = ? AND user_id = ?').get(id, userId),
      );
    },

    latestPlan(userId) {
      return mapPlan(
        db.prepare('SELECT * FROM farm_plans WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId),
      );
    },

    updatePlan(id, userId, patch) {
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
      if (patch.advisorySnapshot !== undefined) {
        sets.push('advisory_snapshot = ?');
        params.push(JSON.stringify(patch.advisorySnapshot));
      }
      if (!sets.length) return this.getPlan(id, userId);
      sets.push('updated_at = ?');
      params.push(new Date().toISOString(), id, userId);
      db.prepare(`UPDATE farm_plans SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
      return this.getPlan(id, userId);
    },

    addPlanAction({ planId, userId, actionType, payload, status = 'pending' }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO plan_actions (
          id, plan_id, user_id, action_type, payload_json, status, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      ).run(
        id,
        planId,
        userId,
        actionType,
        payload ? JSON.stringify(payload) : null,
        status,
        createdAt,
      );
      return mapPlanAction(
        db.prepare('SELECT * FROM plan_actions WHERE id = ?').get(id),
      );
    },

    listPlanActions(planId, status = null) {
      if (status) {
        return db.prepare(
          'SELECT * FROM plan_actions WHERE plan_id = ? AND status = ? ORDER BY created_at ASC',
        ).all(planId, status).map(mapPlanAction);
      }
      return db.prepare(
        'SELECT * FROM plan_actions WHERE plan_id = ? ORDER BY created_at ASC',
      ).all(planId).map(mapPlanAction);
    },

    updatePlanAction(id, patch) {
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
      db.prepare(`UPDATE plan_actions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    },

    createFeedback({ userId, planId = null, rating, comment = null }) {
      this.ensureUser(userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(
        `INSERT INTO guidance_feedback (id, user_id, plan_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, planId, rating, comment, createdAt);
      return { id, userId, planId, rating, comment, createdAt };
    },

    listFeedback(userId) {
      return db.prepare(
        'SELECT * FROM guidance_feedback WHERE user_id = ? ORDER BY created_at DESC',
      ).all(userId).map((row) => ({
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
      }));
    },
  };
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function mapAdvisory(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    crops: parseJson(row.crops, []),
    regions: parseJson(row.regions, []),
    urgency: row.urgency,
    summary: row.summary,
    symptoms: parseJson(row.symptoms, []),
    field_checks: parseJson(row.field_checks, []),
    remediation: row.remediation,
    caution: row.caution,
    protocol_ref: row.protocol_ref,
    sms_en: row.sms_en,
    sms_sw: row.sms_sw,
    last_updated: row.last_updated,
    data_source: row.data_source,
    is_demo_data: Boolean(row.is_demo_data),
  };
}

function mapPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    advisoryId: row.advisory_id,
    status: row.status,
    syncStatus: row.sync_status,
    intent: parseJson(row.intent_json, null),
    queryText: row.query_text,
    advisorySnapshot: parseJson(row.advisory_snapshot, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanAction(row) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    actionType: row.action_type,
    payload: parseJson(row.payload_json, null),
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
