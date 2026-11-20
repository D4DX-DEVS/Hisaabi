// Run with: node src/utils/inputGuard.test.js
const assert = require('assert');
const {
  InputError, isYmd, spanDays, assertDateRange, assertString, hasUnsafeKeys, rejectUnsafeKeys,
} = require('./inputGuard');

// Real dates only.
assert.ok(isYmd('2026-11-20'));
assert.ok(isYmd('2028-02-29'));
assert.ok(!isYmd('2026-02-30'));
assert.ok(!isYmd('2026-13-01'));
assert.ok(!isYmd('2026-1-1'));
assert.ok(!isYmd('0001-01-01T00:00:00Z'));
assert.ok(!isYmd({ $ne: null }));
assert.ok(!isYmd(undefined));

// Span is inclusive.
assert.strictEqual(spanDays('2026-11-01', '2026-11-01'), 1);
assert.strictEqual(spanDays('2026-11-01', '2026-11-30'), 30);
assert.strictEqual(spanDays('2026-11-05', '2026-11-01'), -3);

// Ranges: ok, too long, bad dates, backwards is allowed.
assertDateRange('2026-01-01', '2026-12-31');
assertDateRange('2026-11-05', '2026-11-01');
assert.throws(() => assertDateRange('0001-01-01', '9999-12-31'), InputError);
assert.throws(() => assertDateRange('2026-01-01', '2027-03-01'), /too long/);
assert.throws(() => assertDateRange('nope', '2026-01-01'), InputError);
assert.throws(() => assertDateRange(['2026-01-01'], '2026-01-02'), InputError);

// Strings.
assert.strictEqual(assertString('  ABC123 ', 'code', 20), 'ABC123');
assert.throws(() => assertString({ $ne: null }, 'code'), InputError);
assert.throws(() => assertString('', 'code'), InputError);
assert.throws(() => assertString('x'.repeat(300), 'code'), InputError);

// Unsafe keys, however deep.
assert.ok(hasUnsafeKeys({ group_id: { $ne: null } }));
assert.ok(hasUnsafeKeys({ a: [{ b: { $regex: '^B' } }] }));
assert.ok(hasUnsafeKeys(JSON.parse('{"__proto__":{"x":1}}')));
assert.ok(!hasUnsafeKeys({ group_id: 'ABC123', keys: ['a.b', '$notAKey'], n: 1, ok: true }));
let deep = {}; let cur = deep;
for (let i = 0; i < 30; i++) { cur.n = {}; cur = cur.n; }
assert.ok(hasUnsafeKeys(deep));

// Middleware: rejects bad bodies and queries, passes good ones.
function run(req) {
  const out = {};
  const res = { status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; } };
  rejectUnsafeKeys(req, res, () => { out.next = true; });
  return out;
}
assert.strictEqual(run({ body: { group_id: { $ne: null } }, query: {} }).code, 400);
assert.strictEqual(run({ body: {}, query: { 'date': { $ne: 'x' } } }).code, 400);
assert.ok(run({ body: { group_id: 'ABC123' }, query: { date: '2026-11-20' } }).next);

console.log('inputGuard: all checks passed');
