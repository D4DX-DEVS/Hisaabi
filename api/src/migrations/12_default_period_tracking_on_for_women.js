/**
 * Migration 12: Personal Cycle Mode is on by default for women
 *
 * Migration 11 (and the old default) stored period_tracking = false for every
 * woman who had not recorded a cycle. Cycle mode is now on by default for women,
 * and the app and API treat a stored false as the user's own choice, so those
 * stored falses would keep it off for women who never touched the switch.
 *
 * This turns period_tracking on for women whose stored value is false. It cannot
 * tell a woman who switched it off on purpose from one who never saw it, so it
 * is a one-time catch-up that is meant to run once, at release. Turning it off
 * again in Settings afterwards sticks, because nothing re-runs this.
 *
 * It only flips the switch. No cycle is recorded and nothing is shown beyond the
 * Personal Cycle card in the Tracker.
 *
 * Safe to run multiple times. Run with --dry-run first to see the counts.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);

  const { User } = require('../models');

  const users = await User.find({
    gender: 'f',
    'settings.female_settings.period_tracking': false,
  });
  console.log(`  Women with period_tracking stored as false: ${users.length}`);

  let turnedOn = 0;
  for (const user of users) {
    const settings = user.settings || {};
    const female = settings.female_settings;
    if (!female || female.period_tracking !== false) continue;

    female.period_tracking = true;
    if (female.maintain_streaks_during_period === undefined) {
      female.maintain_streaks_during_period = true;
    }
    turnedOn++;

    if (!DRY_RUN) {
      settings.female_settings = female;
      user.settings = settings;
      user.markModified('settings');
      await user.save();
    }
  }

  console.log(`  period_tracking -> true: ${turnedOn}`);
  await mongoose.disconnect();
  console.log(`Migration 12 complete.${DRY_RUN ? ' (dry run — nothing written)' : ''}`);
}

run().catch((err) => {
  console.error('Migration 12 failed:', err);
  process.exit(1);
});
