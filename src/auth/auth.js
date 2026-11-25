import crypto from 'node:crypto';

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const MAX_ATTEMPTS = 5;

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Normalise to digits-only international form. Kenyan local numbers (07.., 01.., 7..) become 254... */
export function normalizePhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (!/^[+\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  let full = digits;
  if (!raw.startsWith('+')) {
    if (/^0[17]\d{8}$/.test(digits)) full = `254${digits.slice(1)}`;
    else if (/^[17]\d{8}$/.test(digits)) full = `254${digits}`;
    else if (digits.startsWith('00')) full = digits.slice(2);
  }
  if (!/^\d{10,15}$/.test(full)) return null;
  return full;
}

export function userIdForPhone(phone) {
  return `p${phone}`;
}

export function maskPhone(phone) {
  return `+${phone.slice(0, 3)}••••${phone.slice(-3)}`;
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function codeHash(phone, code) {
  return sha256(`fikaai-otp:${phone}:${code}`);
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Prints codes to the server log. Demo/development only. */
export function createConsoleSender(log = console.log) {
  return {
    name: 'console',
    async send({ to, text }) {
      log(`[sms:console] to +${to}: ${text}`);
    },
  };
}

/** Africa's Talking bulk SMS. Needs AT_USERNAME and AT_API_KEY. Not exercised by the test suite. */
export function createAfricasTalkingSender({ username, apiKey, senderId = '', sandbox = false, fetchImpl = fetch }) {
  const base = sandbox ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  return {
    name: 'africastalking',
    async send({ to, text }) {
      const body = new URLSearchParams({ username, to: `+${to}`, message: text });
      if (senderId) body.set('from', senderId);
      const res = await fetchImpl(`${base}/version1/messaging`, {
        method: 'POST',
        headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
    },
  };
}

export function createAuth({ repo, sender, demoCodes = false, now = () => Date.now() }) {
  return {
    senderName: sender.name,

    async requestCode(phoneInput) {
      const phone = normalizePhone(phoneInput);
      if (!phone) throw new AuthError(400, 'Enter a valid phone number, for example 0712 345 678');
      const t = now();
      const existing = repo.getAuthCode(phone);
      let sentCount = 1;
      let windowStart = t;
      if (existing && t - existing.windowStart < SEND_WINDOW_MS) {
        if (existing.sentCount >= MAX_SENDS_PER_WINDOW) {
          throw new AuthError(429, 'Too many codes requested. Try again in a few minutes.');
        }
        sentCount = existing.sentCount + 1;
        windowStart = existing.windowStart;
      }
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      repo.saveAuthCode({
        phone,
        codeHash: codeHash(phone, code),
        expiresAt: t + CODE_TTL_MS,
        attempts: 0,
        sentCount,
        windowStart,
      });
      try {
        await sender.send({ to: phone, text: `Your FikaAI code is ${code}. It expires in 10 minutes. Do not share it.` });
      } catch {
        repo.deleteAuthCode(phone);
        throw new AuthError(502, 'Could not send the SMS right now. Please try again.');
      }
      return { expiresInSeconds: CODE_TTL_MS / 1000, ...(demoCodes ? { demoCode: code } : {}) };
    },

    verifyCode(phoneInput, codeInput) {
      const phone = normalizePhone(phoneInput);
      const code = String(codeInput ?? '').trim();
      if (!phone || !/^\d{6}$/.test(code)) throw new AuthError(400, 'Enter the 6-digit code from the SMS');
      const row = repo.getAuthCode(phone);
      if (!row || row.expiresAt < now()) throw new AuthError(400, 'That code has expired. Request a new one.');
      if (row.attempts >= MAX_ATTEMPTS) {
        repo.deleteAuthCode(phone);
        throw new AuthError(429, 'Too many wrong attempts. Request a new code.');
      }
      if (!safeEqual(row.codeHash, codeHash(phone, code))) {
        repo.bumpAuthAttempts(phone);
        throw new AuthError(400, 'That code is not right. Check the SMS and try again.');
      }
      repo.deleteAuthCode(phone);
      const userId = userIdForPhone(phone);
      repo.ensureUser(userId, maskPhone(phone));
      const token = crypto.randomBytes(32).toString('base64url');
      repo.createSession({ tokenHash: sha256(token), userId, expiresAt: now() + SESSION_TTL_MS });
      return { token, userId, phoneMasked: maskPhone(phone), expiresAt: new Date(now() + SESSION_TTL_MS).toISOString() };
    },

    sessionFromToken(token) {
      if (!token) return null;
      const row = repo.getSession(sha256(token));
      if (!row || row.expiresAt < now()) return null;
      return { userId: row.userId, tokenHash: row.tokenHash };
    },

    logout(token) {
      if (token) repo.deleteSession(sha256(token));
    },
  };
}
