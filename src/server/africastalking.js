import crypto from 'node:crypto';
import { normalizePhone, userIdForPhone } from '../auth/auth.js';

const USSD_MAX = 182;

function secretMatches(given, expected) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Africa's Talking callbacks. The phone number the network reports becomes the user id, so a
 * farmer's USSD/SMS activity lands in the same account they sign in to on the web.
 * AT does not sign callbacks, so the callback URL carries a shared secret: ?key=AT_WEBHOOK_SECRET.
 */
export function registerAfricasTalkingRoutes({ app, config, channels, sender, wrap, httpError }) {
  function guard(req) {
    if (!config.atWebhookSecret) throw httpError(503, 'Africa\'s Talking callbacks are not configured');
    if (!secretMatches(req.query.key, config.atWebhookSecret)) throw httpError(401, 'Unauthorized');
  }

  // USSD: text is the whole path so far ("1*2"); the channel keeps its own state, so only the last entry matters.
  app.post('/api/at/ussd', wrap(async (req, res) => {
    guard(req);
    const phone = normalizePhone(req.body?.phoneNumber);
    res.type('text/plain');
    if (!phone) return res.send('END Sorry, we could not read your phone number.');
    const text = String(req.body?.text ?? '');
    const last = text.split('*').pop() ?? '';
    const result = await channels.ussd.handleTurn(userIdForPhone(phone), last.slice(0, 1000));
    let display = String(result.display ?? '');
    if (display.length > USSD_MAX - 4) display = `${display.slice(0, USSD_MAX - 7)}...`;
    return res.send(`CON ${display}`);
  }));

  // Inbound SMS: answer by SMS from the same number.
  app.post('/api/at/sms', wrap(async (req, res) => {
    guard(req);
    const phone = normalizePhone(req.body?.from);
    const text = String(req.body?.text ?? '').trim().slice(0, 1000);
    if (!phone || !text) throw httpError(400, 'from and text are required');
    const result = await channels.sms.handleTurn(userIdForPhone(phone), text);
    try {
      await sender.send({ to: phone, text: result.display });
    } catch {
      throw httpError(502, 'Could not send the SMS reply');
    }
    res.json({ ok: true, segments: result.segments });
  }));
}
