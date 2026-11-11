// Run with: node src/utils/duplicateGuard.test.js
const assert = require('assert');
const { normalizeName, sameName, rangesOverlap } = require('./duplicateGuard');

// Case and spacing do not make a different name.
assert.strictEqual(normalizeName('  7-Day   Morning Adhkar '), '7-day morning adhkar');
assert.ok(sameName('7-Day Morning Adhkar', '7-day Morning Adhkar'));
assert.ok(sameName('500 pages together', ' 500  PAGES together'));

// Different names, and empty names, are never the same.
assert.ok(!sameName('Fajr', 'Dhuhr'));
assert.ok(!sameName('', ''));
assert.ok(!sameName(null, undefined));

// Same days overlap; a later run of the same name does not.
assert.ok(rangesOverlap('2026-09-01', '2026-09-30', '2026-09-01', '2026-09-30'));
assert.ok(rangesOverlap('2026-09-01', '2026-09-30', '2026-09-30', '2026-10-05')); // share one day
assert.ok(rangesOverlap('2026-09-10', '2026-09-12', '2026-09-01', '2026-09-30')); // inside
assert.ok(!rangesOverlap('2026-09-01', '2026-09-30', '2026-10-01', '2026-10-31'));

console.log('duplicateGuard: all checks passed');
