// backend/services/aiRateLimit.js
/*
|--------------------------------------------------------------------------
| PER-USER RATE LIMITER
|--------------------------------------------------------------------------
| All AI requests hit your shared server keys, so we cap per-user usage.
|
| Limits (per user):
|   - 20 requests per 5 minutes
|   - 100 requests per day
|
| In-memory. Resets on server restart. Move to Redis for production.
|--------------------------------------------------------------------------
*/

const windowBuckets = new Map(); // userId -> { count, resetAt }
const dailyBuckets = new Map();  // userId -> { date, count }

const WINDOW_MS = 5 * 60 * 1000;
const WINDOW_LIMIT = 20;
const DAILY_LIMIT = 100;

const todayKey = () => new Date().toISOString().slice(0, 10);

const checkRateLimit = (userId) => {
  const uid = String(userId);
  const now = Date.now();
  const day = todayKey();

  // ---- Daily cap ----
  const daily = dailyBuckets.get(uid) || { date: day, count: 0 };
  if (daily.date !== day) {
    daily.date = day;
    daily.count = 0;
  }
  if (daily.count >= DAILY_LIMIT) {
    return {
      ok: false,
      reason: `Daily AI limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
    };
  }

  // ---- Window cap ----
  const bucket = windowBuckets.get(uid);
  if (!bucket || bucket.resetAt < now) {
    windowBuckets.set(uid, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    if (bucket.count >= WINDOW_LIMIT) {
      const secondsLeft = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        ok: false,
        reason: `Slow down — try again in ${secondsLeft}s.`,
      };
    }
    bucket.count++;
  }

  daily.count++;
  dailyBuckets.set(uid, daily);

  return { ok: true };
};

module.exports = { checkRateLimit };