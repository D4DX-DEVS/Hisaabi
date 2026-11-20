const {
  updatePrayerStreak,
  updateQuranStreak,
  updateDhikrStreak,
  updateMorningAdhkarStreak,
  updateEveningAdhkarStreak,
  updateCombinedStreak,
  updatePersonalGoalsStreak,
  updateAllStreaks,
} = require('./streakService');

// Map of "userId-streakType" → when it last ran. Updates for the same key are
// at most one per THROTTLE_MS.
const throttleMap = new Map();
// Keys with one more run already scheduled for when their window ends.
const trailing = new Map();
const THROTTLE_MS = 60 * 1000;

async function execute(userId, streakType) {
  switch (streakType) {
    case 'prayer':
      await updatePrayerStreak(userId);
      break;
    case 'quran':
    case 'quran_reading':
      await updateQuranStreak(userId);
      break;
    case 'dhikr':
      await updateDhikrStreak(userId);
      break;
    case 'morning_adhkar':
      await updateMorningAdhkarStreak(userId);
      break;
    case 'evening_adhkar':
      await updateEveningAdhkarStreak(userId);
      break;
    case 'combined':
      await updateCombinedStreak(userId);
      break;
    case 'personal_goals':
      await updatePersonalGoalsStreak(userId);
      break;
    case 'all':
      await updateAllStreaks(userId);
      break;
    default:
      break;
  }
}

function run(userId, streakType, key) {
  throttleMap.set(key, Date.now());
  // Forget keys that have been quiet for a while, so the map cannot grow for ever.
  if (throttleMap.size > 1000) {
    const cutoff = Date.now() - THROTTLE_MS * 5;
    for (const [k, t] of throttleMap) if (t < cutoff) throttleMap.delete(k);
  }
  setImmediate(async () => {
    try {
      await execute(userId, streakType);
    } catch (err) {
      console.error(`Streak update error (${streakType}):`, err.message);
    }
  });
}

/**
 * Queue a streak update for a specific type. Runs now if none ran in the last
 * minute. Otherwise one more run is scheduled for when that minute ends, so the
 * last tap of a burst is still counted (it used to be dropped, leaving the
 * stored streak stale until some later write).
 */
function queueStreakUpdate(userId, streakType) {
  const key = `${userId}-${streakType}`;
  const last = throttleMap.get(key);
  const now = Date.now();
  if (last && now - last <= THROTTLE_MS) {
    if (!trailing.has(key)) {
      const timer = setTimeout(() => {
        trailing.delete(key);
        run(userId, streakType, key);
      }, THROTTLE_MS - (now - last) + 50);
      if (timer.unref) timer.unref();
      trailing.set(key, timer);
    }
    return;
  }
  run(userId, streakType, key);
}

/**
 * Queue updates for all streak types
 */
function queueAllStreakUpdates(userId) {
  ['prayer', 'quran_reading', 'dhikr', 'morning_adhkar', 'evening_adhkar', 'combined', 'personal_goals'].forEach(
    (type) => queueStreakUpdate(userId, type)
  );
}

module.exports = { queueStreakUpdate, queueAllStreakUpdates };
