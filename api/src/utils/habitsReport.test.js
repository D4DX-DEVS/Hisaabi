// Run with: node src/utils/habitsReport.test.js
const assert = require('assert');
const { buildHabits } = require('./habitsReport');

const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
const habits = buildHabits(days, {
  prayerRecords: [
    { date: '2026-11-09', sunnah_prayers: { duha: true, tahajjud: 2 } },
    { date: '2026-11-11', sunnah_prayers: { duha: true } },
    { date: '2026-11-20', sunnah_prayers: { duha: true } }, // outside the period: ignored
  ],
  deedRecords: [
    { date: '2026-11-10', deed_key: 'custom:read_book', label: 'Read a book', category: 'other', count: 5 },
    { date: '2026-11-11', deed_key: 'custom:read_book', label: 'Read a book', category: 'other', count: 2 },
    { date: '2026-11-10', deed_key: 'sadaqah', label: null, category: 'sadaqah', count: 1 },
  ],
  dhikrRecords: [{ date: '2026-11-12', dhikr_counts: { subhanallah: 33 } }],
  quranRecords: [{ date: '2026-11-09', pages_recited: 6, surah_recitations: { 36: 3 } }],
  customDeeds: [
    { key: 'custom:read_book', label: 'Read a book', kind: 'count', target: 3 },
    { key: 'custom:no_phone_after_isha', label: 'No phone after Isha', kind: 'tick', target: null }, // nothing logged
  ],
});
const by = (key) => habits.find((h) => h.key === key);

// "How many days did I pray Duha this week": 2 of 4, the out-of-period day is not counted.
assert.strictEqual(by('sunnah:duha').days_done, 2);
assert.strictEqual(by('sunnah:duha').total, 4);
assert.strictEqual(by('sunnah:duha').label, 'Duha');

// A count habit with a target is done only on days the target was met (5 >= 3 yes, 2 >= 3 no).
assert.strictEqual(by('custom:read_book').days_done, 1);
assert.strictEqual(by('custom:read_book').target, 3);

// Own habits appear with nothing logged, and come first.
assert.strictEqual(by('custom:no_phone_after_isha').days_done, 0);
assert.strictEqual(by('custom:no_phone_after_isha').kind, 'tick');
assert.strictEqual(habits[0].group, 'Habits');

// Predefined deeds, dhikr and Qur'an recitation are picked up.
assert.strictEqual(by('sadaqah').days_done, 1);
assert.strictEqual(by('dhikr:subhanallah').days[3].count, 33);
assert.strictEqual(by('quran:pages_recited').days[0].count, 6);
assert.strictEqual(by('quran:surah:36').days_done, 1);

// Day-by-day series follows the period's days in order.
assert.deepStrictEqual(by('sunnah:duha').days.map((d) => d.done), [true, false, true, false]);

console.log('habitsReport: all checks passed');
