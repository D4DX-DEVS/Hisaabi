/**
 * Helpers that stop the same thing being created twice: a name counts as the
 * same when it matches ignoring case and extra spaces ("7-Day Adhkar" and
 * "7-day  adhkar").
 */
const normalizeName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

const sameName = (a, b) => normalizeName(a) !== '' && normalizeName(a) === normalizeName(b);

// Two YYYY-MM-DD ranges share at least one day.
const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;

module.exports = { normalizeName, sameName, rangesOverlap };
