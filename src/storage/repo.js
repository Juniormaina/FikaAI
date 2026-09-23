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
    },
  };
}
