// Run with: node src/utils/activityOrder.test.js
const assert = require('assert');
const { sortActivities } = require('./activityOrder');

const names = (list) => list.map((a) => a.n).join(',');

// Nothing placed yet: newest first, as before.
assert.strictEqual(
  names(sortActivities([
    { n: 'old', sort_order: null, date: '2026-09-01' },
    { n: 'new', date: '2026-10-01' },
  ])),
  'new,old'
);

// Placed ones come first in their saved order, then the unplaced (newest first).
assert.strictEqual(
  names(sortActivities([
    { n: 'c', sort_order: 2, date: '2026-01-01' },
    { n: 'fresh', sort_order: null, date: '2026-11-01' },
    { n: 'a', sort_order: 0, date: '2026-03-01' },
    { n: 'b', sort_order: 1, date: '2026-02-01' },
    { n: 'older', sort_order: null, date: '2026-05-01' },
  ])),
  'a,b,c,fresh,older'
);

// Position 0 counts as placed, and the input array is not changed.
const input = [{ n: 'x', sort_order: 0, date: '2026-01-01' }, { n: 'y', sort_order: null, date: '2026-12-01' }];
assert.strictEqual(names(sortActivities(input)), 'x,y');
assert.strictEqual(names(input), 'x,y');

console.log('activityOrder: all checks passed');
