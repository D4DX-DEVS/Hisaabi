/**
 * Per-user request cap for the AI assistant proxy.
 *
 * Before this, the client called OpenRouter directly with a key baked into
 * the APK — anyone could pull it out and run up the bill with no limit at
 * all. Now that the call is proxied through here, this is the one place
 * that can actually stop that: a fixed number of requests per user per
 * rolling hour, tracked in memory (same pattern as
 * streakQueueService.js's throttle map — a low-volume, single-process
 * check that doesn't need its own collection).
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 30;

// userId -> timestamps of requests still inside the current window
const requestLog = new Map();

/**
 * Records this request if the user is under their cap.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
function checkAndRecord(userId) {
  const now = Date.now();
  const key = userId.toString();
  const timestamps = (requestLog.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return { allowed: true };
}

module.exports = { checkAndRecord };
