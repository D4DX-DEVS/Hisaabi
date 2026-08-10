/**
 * Migration 11: Turn Personal Cycle Mode off for users who never opted in
 *
 * Personal Cycle Mode must default OFF (FR: "Enable/Disable Feature — Default OFF").
 * Earlier code set female_settings.period_tracking = true automatically whenever a
 * user selected gender 'f', so existing accounts were opted in without asking.
 *
 * This flips period_tracking to false ONLY for users who have never recorded a
 * period. Users with at least one PeriodTracking record demonstrably chose to use
 * the feature — silently disabling them would lose working state, so they are left
 * untouched.
 *
 * Also backfills quran_during_menstruation for accounts predating that setting.
 *
 * Safe to run multiple times.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);

  const { User, PeriodTracking } = require('../models');

  const users = await User.find({ gender: 'f' });
  console.log(`  Found ${users.length} users with gender 'f'`);

  let turnedOff = 0;
  let keptOn = 0;
  let quranBackfilled = 0;

  for (const user of users) {
    const settings = user.settings || {};
    const female = settings.female_settings;
    if (!female) continue;

    let changed = false;

    if (female.period_tracking === true) {
      const recordCount = await PeriodTracking.countDocuments({ user_id: user._id });
      if (recordCount === 0) {
        female.period_tracking = false;
        changed = true;
        turnedOff++;
      } else {
        keptOn++;
      }
    }

    if (female.quran_during_menstruation === undefined) {
      female.quran_during_menstruation = 'memory_or_device';
      changed = true;
      quranBackfilled++;
    }

    if (changed && !DRY_RUN) {
      settings.female_settings = female;
      user.settings = settings;
      user.markModified('settings');
      await user.save();
    }
  }

  console.log(`  period_tracking -> false (never used the feature): ${turnedOff}`);
  console.log(`  period_tracking left true (has period records):    ${keptOn}`);
  console.log(`  quran_during_menstruation backfilled:              ${quranBackfilled}`);

  await mongoose.disconnect();
  console.log(`Migration 11 complete.${DRY_RUN ? ' (dry run — nothing written)' : ''}`);
}

run().catch((err) => {
  console.error('Migration 11 failed:', err);
  process.exit(1);
});
