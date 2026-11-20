/**
 * Small guards for untrusted request data: dates, date ranges, plain-text
 * identifiers, and keys that would turn a request body into a database
 * operator or a prototype write.
 */

/** A request the client got wrong (400), not a server fault. */
class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
    this.status = 400;
  }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

/** The longest day range any endpoint will expand (a leap year plus slack). */
const MAX_RANGE_DAYS = 400;

/** A real calendar date written YYYY-MM-DD ("2026-02-30" is not one). */
function isYmd(value) {
  if (typeof value !== 'string' || !YMD.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

/** Days from start to end inclusive; 0 or less when end is before start. */
function spanDays(start, end) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

/**
 * Throws InputError unless start and end are real dates and the range is at
 * most `max` days. An end before the start is allowed (it expands to nothing).
 */
function assertDateRange(start, end, max = MAX_RANGE_DAYS) {
  if (!isYmd(start) || !isYmd(end)) {
    throw new InputError('Dates must be real dates written YYYY-MM-DD');
  }
  if (spanDays(start, end) > max) {
    throw new InputError(`Date range is too long (at most ${max} days)`);
  }
}

/** Throws InputError unless value is a non-empty string of at most `max` characters. */
function assertString(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new InputError(`${label} must be a text value of at most ${max} characters`);
  }
  return value.trim();
}

/**
 * True if any key anywhere in `value` starts with "$" or is __proto__ — the
 * shapes behind NoSQL operator injection and prototype pollution. Depth is
 * capped so a deeply nested body cannot be used to burn CPU.
 */
function hasUnsafeKeys(value, depth = 0) {
  if (value === null || typeof value !== 'object') return false;
  if (depth > 20) return true;
  const items = Array.isArray(value) ? value : Object.keys(value);
  if (Array.isArray(value)) return items.some((v) => hasUnsafeKeys(v, depth + 1));
  for (const key of items) {
    if (key.startsWith('$') || key === '__proto__') return true;
    if (hasUnsafeKeys(value[key], depth + 1)) return true;
  }
  return false;
}

/** Express middleware: reject bodies and queries that carry unsafe keys. */
function rejectUnsafeKeys(req, res, next) {
  if (hasUnsafeKeys(req.body) || hasUnsafeKeys(req.query)) {
    return res.status(400).json({ error: 'Request contains characters that are not allowed' });
  }
  return next();
}

/** Dot-path segments that must never be followed or written. */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

module.exports = {
  InputError,
  MAX_RANGE_DAYS,
  isYmd,
  spanDays,
  assertDateRange,
  assertString,
  hasUnsafeKeys,
  rejectUnsafeKeys,
  FORBIDDEN_SEGMENTS,
};
