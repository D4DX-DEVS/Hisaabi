const assert = require('assert');
const { cycleModeOn, keepStreaksDuringCycle } = require('./cycleMode');

const fs = (female_settings, gender) => ({ gender, settings: { female_settings } });

assert.strictEqual(cycleModeOn(fs(undefined, 'f')), true, 'woman with no stored choice: on');
assert.strictEqual(cycleModeOn({ gender: 'f' }), true, 'woman with no settings at all: on');
assert.strictEqual(cycleModeOn(fs({ period_tracking: false }, 'f')), false, 'her own off wins');
assert.strictEqual(cycleModeOn(fs({ period_tracking: true }, 'f')), true);
assert.strictEqual(cycleModeOn(fs(undefined, 'm')), false, 'man: off');
assert.strictEqual(cycleModeOn({ gender: null }), false, 'gender unset: off');
assert.strictEqual(cycleModeOn(null), false);
assert.strictEqual(cycleModeOn(fs({ period_tracking: true }, 'm')), true, 'a stored on is honoured');

assert.strictEqual(keepStreaksDuringCycle(fs(undefined, 'f')), true);
assert.strictEqual(keepStreaksDuringCycle(fs({ maintain_streaks_during_period: false }, 'f')), false);
assert.strictEqual(keepStreaksDuringCycle(fs({ maintain_streaks_during_period: true }, 'm')), true);
assert.strictEqual(keepStreaksDuringCycle({ gender: 'm' }), false);
console.log('cycleMode: all checks passed');
