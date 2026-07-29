const {
  updatePrayerStreak,
  updateQuranStreak,
  updateDhikrStreak,
  updateCombinedStreak,
  updateAllStreaks,
} = require('./streakService');

// Map of "userId-streakType" → timestamp of last queue (throttle 60s)
const throttleMap = new Map();
const THROTTLE_MS = 60 * 1000;

function shouldProcess(key) {
  const last = throttleMap.get(key);
  if (!last) return true;
  return Date.now() - last > THROTTLE_MS;
}

function markProcessed(key) {
  throttleMap.set(key, Date.now());
}

/**
 * Queue a streak update for a specific type (throttled)
 */
function queueStreakUpdate(userId, streakType) {
  const key = `${userId}-${streakType}`;
  if (!shouldProcess(key)) return;
  markProcessed(key);

  setImmediate(async () => {
    try {
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
        case 'combined':
          await updateCombinedStreak(userId);
          break;
        case 'all':
          await updateAllStreaks(userId);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`Streak update error (${streakType}):`, err.message);
    }
  });
}

/**
 * Queue updates for all streak types
 */
function queueAllStreakUpdates(userId) {
  ['prayer', 'quran_reading', 'dhikr', 'combined'].forEach((type) =>
    queueStreakUpdate(userId, type)
  );
}

module.exports = { queueStreakUpdate, queueAllStreakUpdates };
