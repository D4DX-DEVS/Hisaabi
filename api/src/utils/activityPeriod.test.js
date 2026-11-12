// Run with: node src/utils/activityPeriod.test.js
const assert = require('assert');
const { periodKey, resolveDay, entryPeriod, statusesForPeriod, dayInZone, recentHistory } = require('./activityPeriod');

// Keys: day, Monday-start week, month; recurring behaves like daily.
assert.strictEqual(periodKey('daily', '2026-11-10'), 'd:2026-11-10');
assert.strictEqual(periodKey('recurring', '2026-11-10'), 'd:2026-11-10');
assert.strictEqual(periodKey('weekly', '2026-11-10'), 'w:2026-11-09'); // Tuesday -> Monday
assert.strictEqual(periodKey('weekly', '2026-11-15'), 'w:2026-11-09'); // Sunday -> same week
assert.strictEqual(periodKey('weekly', '2026-11-16'), 'w:2026-11-16');
assert.strictEqual(periodKey('monthly', '2026-11-30'), 'm:2026-11');

// A daily status set yesterday no longer counts today; a weekly one still does.
const zone = 'Asia/Kolkata';
const entries = [
  { user: 'a', status: 'completed', period: 'd:2026-11-09' },
  { user: 'b', status: 'completed', updatedAt: '2026-11-09T05:00:00.000Z' }, // legacy, no period
  { user: 'c', status: 'completed', period: 'd:2026-11-10' },
];
assert.deepStrictEqual(statusesForPeriod(entries, 'daily', '2026-11-10', zone).map((e) => e.user), ['c']);
assert.deepStrictEqual(statusesForPeriod(entries, 'daily', '2026-11-09', zone).map((e) => e.user), ['a', 'b']);
assert.strictEqual(entryPeriod({ status: '', updatedAt: null }, 'daily', zone), null); // placeholder never counts

// The day is the member's local day: 23:00 UTC is already tomorrow in India.
const lateUtc = new Date('2026-11-09T23:00:00.000Z');
assert.strictEqual(dayInZone('Asia/Kolkata', lateUtc), '2026-11-10');
assert.strictEqual(dayInZone('UTC', lateUtc), '2026-11-09');
assert.strictEqual(dayInZone('Not/AZone', lateUtc), '2026-11-10'); // bad zone falls back

// A sent date is used only when it is a real date close to now.
const now = new Date('2026-11-10T08:00:00.000Z');
assert.strictEqual(resolveDay('2026-11-10', zone, now), '2026-11-10');
assert.strictEqual(resolveDay('2030-01-01', zone, now), '2026-11-10');
assert.strictEqual(resolveDay('garbage', zone, now), '2026-11-10');

// History: last 7 days for daily, ending today; earlier days stay as they were.
const hist = recentHistory(
  [
    { user: 'a', status: 'completed', period: 'd:2026-11-10' },
    { user: 'a', status: 'completed', period: 'd:2026-11-12' },
    { user: 'b', status: 'completed', period: 'd:2026-11-13' },
  ],
  'a', 'daily', '2026-11-13', 'Asia/Kolkata'
);
assert.strictEqual(hist.length, 7);
assert.strictEqual(hist[6].period, 'd:2026-11-13');
assert.deepStrictEqual(hist.filter((h) => h.done).map((h) => h.period), ['d:2026-11-10', 'd:2026-11-12']);
const wk = recentHistory([{ user: 'a', status: 'completed', period: 'w:2026-11-02' }], 'a', 'weekly', '2026-11-13', 'Asia/Kolkata');
assert.strictEqual(wk.length, 4);
assert.deepStrictEqual(wk.map((h) => h.period), ['w:2026-10-19', 'w:2026-10-26', 'w:2026-11-02', 'w:2026-11-09']);
assert.deepStrictEqual(wk.map((h) => h.done), [false, false, true, false]);
const mo = recentHistory([], 'a', 'monthly', '2026-11-13', 'Asia/Kolkata');
assert.deepStrictEqual(mo.map((h) => h.period), ['m:2026-08', 'm:2026-09', 'm:2026-10', 'm:2026-11']);

console.log('activityPeriod: all checks passed');
