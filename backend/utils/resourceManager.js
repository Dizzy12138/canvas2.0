const concurrencyState = new Map();
const rateState = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute window for rate limiting

function getState(map, key, fallback) {
  if (!map.has(key)) {
    map.set(key, fallback instanceof Function ? fallback() : fallback);
  }
  return map.get(key);
}

function checkRateLimit(app) {
  if (!app.rateLimit || app.rateLimit <= 0) {
    return true;
  }
  const now = Date.now();
  const timestamps = getState(rateState, app.id, []);
  const filtered = timestamps.filter(ts => now - ts < RATE_WINDOW_MS);
  if (filtered.length >= app.rateLimit) {
    rateState.set(app.id, filtered);
    return false;
  }
  filtered.push(now);
  rateState.set(app.id, filtered);
  return true;
}

function acquireConcurrency(appId, limit) {
  if (!limit || limit <= 0) {
    return true;
  }
  const current = getState(concurrencyState, appId, 0);
  if (current >= limit) {
    return false;
  }
  concurrencyState.set(appId, current + 1);
  return true;
}

function releaseConcurrency(appId) {
  const current = getState(concurrencyState, appId, 0);
  const next = Math.max(0, current - 1);
  concurrencyState.set(appId, next);
}

module.exports = {
  acquireConcurrency,
  releaseConcurrency,
  checkRateLimit,
};
