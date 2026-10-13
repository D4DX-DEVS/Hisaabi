const { PrayerTracking, QuranReading, DhikrTracking, AdhkarTracking, PeriodTracking, Streak, WorshipGoal } = require('../models');
const { getCurrentDate, getDaysBetweenDates, formatDate } = require('../utils/dateUtils');
const { computeMetric } = require('./worshipMetrics');

/**
 * Calculate streak for a given activity type.
 * Counts backward from today continuously until a day without activity is found.
 * Uses streak_broken_date as a floor to avoid scanning entire history.
 */
async function calculateStreak(userId, activityType, getActivityDatesFunc, isFemaleMaintainStreaks = false) {
  const today = getCurrentDate();

  // Get period dates if female grace is enabled
  let periodDates = new Set();
  if (isFemaleMaintainStreaks) {
    const periods = await PeriodTracking.find({ user_id: userId });
    for (const p of periods) {
      const days = getDaysBetweenDates(p.start_date, p.end_date);
      days.forEach((d) => periodDates.add(d));
    }
  }

  // Get existing streak record for floor
  const existing = await Streak.findOne({ user_id: userId, streak_type: activityType });
  const floorDate = existing && existing.streak_broken_date
    ? formatDate(existing.streak_broken_date)
    : null;

  // Get all activity dates
  const activityDates = new Set(await getActivityDatesFunc());

  // Count backward from today
  let current = new Date(today);
  let streak = 0;

  // Check if today or yesterday has activity (if today has no activity, streak may still be active from yesterday)
  // We count from today backward
  while (true) {
    const dateStr = formatDate(current);
    // Stop at floor date
    if (floorDate && dateStr < floorDate) break;

    const hasActivity = activityDates.has(dateStr) || periodDates.has(dateStr);
    if (!hasActivity) {
      // If it's today and no activity yet, don't break (streak still alive from yesterday)
      if (dateStr === today) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      break;
    }
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Get prayer activity dates for a user
 */
async function getPrayerActivityDates(userId) {
  const records = await PrayerTracking.find({ user_id: userId });
  return records
    .filter((r) => {
      const fp = r.fardh_prayers || {};
      return ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].some((p) => fp[p] === true);
    })
    .map((r) => r.date);
}

/**
 * Get quran reading activity dates for a user
 */
async function getQuranActivityDates(userId) {
  const records = await QuranReading.find({ user_id: userId });
  return records.filter((r) => r.pages_read && r.pages_read.length > 0).map((r) => r.date);
}

/**
 * Get dhikr activity dates for a user
 */
async function getDhikrActivityDates(userId) {
  const records = await DhikrTracking.find({ user_id: userId });
  return records
    .filter((r) => {
      const counts = r.dhikr_counts || {};
      return Object.values(counts).some((v) => v > 0);
    })
    .map((r) => r.date);
}

/**
 * Get morning adhkar activity dates for a user
 */
async function getMorningAdhkarActivityDates(userId) {
  const records = await AdhkarTracking.find({ user_id: userId, morning: true });
  return records.map((r) => r.date);
}

/**
 * Get evening adhkar activity dates for a user
 */
async function getEveningAdhkarActivityDates(userId) {
  const records = await AdhkarTracking.find({ user_id: userId, evening: true });
  return records.map((r) => r.date);
}

/**
 * Whether every one of the given goals was met on a specific day. Manual
 * goals read straight from their own per-day ledger (`manual_progress` is
 * additive, never overwritten, so it already holds real history); metric
 * goals are recomputed for that single day exactly like goalWithProgress
 * does for "today" — no separate completion ledger needed for those either.
 */
async function dailyGoalsMetOn(dateStr, goals) {
  const results = await Promise.all(
    goals.map(async (g) => {
      if (g.metric === 'manual') {
        return (Number((g.manual_progress || {})[dateStr]) || 0) >= g.target;
      }
      const current = await computeMetric(g.user_id, g.metric, dateStr, dateStr);
      return current >= g.target;
    })
  );
  return results.every(Boolean);
}

/**
 * FR §21's "Personal goals" streak: consecutive days where every currently
 * active daily-period goal was met (AND, not OR — a slip on any one goal
 * breaks it, matching the other single-activity streaks' all-or-nothing
 * feel). Weekly/monthly goals don't fit a daily streak and are excluded.
 *
 * Bounded to the most-recently-created active goal's date — the exact set
 * of goals being judged didn't fully exist before that day, so nothing
 * earlier can honestly count.
 */
async function calculatePersonalGoalsStreak(userId, isFemaleMaintainStreaks = false) {
  const today = getCurrentDate();
  const goals = await WorshipGoal.find({ user_id: userId, active: true, period: 'daily' });
  if (goals.length === 0) return { streak: 0, lastActivityDate: null };

  const windowStart = goals.reduce((latest, g) => {
    const created = formatDate(g.created_at);
    return created > latest ? created : latest;
  }, '0000-00-00');

  let periodDates = new Set();
  if (isFemaleMaintainStreaks) {
    const periods = await PeriodTracking.find({ user_id: userId });
    for (const p of periods) {
      getDaysBetweenDates(p.start_date, p.end_date).forEach((d) => periodDates.add(d));
    }
  }

  const existing = await Streak.findOne({ user_id: userId, streak_type: 'personal_goals' });
  const floorDate = existing && existing.streak_broken_date
    ? formatDate(existing.streak_broken_date)
    : null;

  let current = new Date(today);
  let streak = 0;
  let lastActivityDate = null;

  while (true) {
    const dateStr = formatDate(current);
    if (dateStr < windowStart) break;
    if (floorDate && dateStr < floorDate) break;

    const hasActivity = periodDates.has(dateStr) || (await dailyGoalsMetOn(dateStr, goals));
    if (!hasActivity) {
      if (dateStr === today) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      break;
    }
    if (!lastActivityDate) lastActivityDate = new Date(current);
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return { streak, lastActivityDate };
}

/**
 * Upsert streak record
 */
async function upsertStreak(userId, streakType, currentStreak, lastActivityDate) {
  const existing = await Streak.findOne({ user_id: userId, streak_type: streakType });
  if (existing) {
    const longestStreak = Math.max(existing.longest_streak, currentStreak);
    // If streak broke (current < existing.current), record broken date
    let streak_broken_date = existing.streak_broken_date;
    if (currentStreak === 0 && existing.current_streak > 0) {
      streak_broken_date = new Date();
    }
    existing.current_streak = currentStreak;
    existing.longest_streak = longestStreak;
    existing.last_activity_date = lastActivityDate || existing.last_activity_date;
    existing.streak_broken_date = streak_broken_date;
    await existing.save();
    return existing;
  } else {
    return await Streak.create({
      user_id: userId,
      streak_type: streakType,
      current_streak: currentStreak,
      longest_streak: currentStreak,
      last_activity_date: lastActivityDate,
    });
  }
}

/**
 * Update prayer streak
 */
async function updatePrayerStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const streak = await calculateStreak(
    userId,
    'prayer',
    () => getPrayerActivityDates(userId),
    isFemaleMaintain
  );

  const lastRecord = await PrayerTracking.findOne({ user_id: userId }).sort({ date: -1 });
  const lastDate = lastRecord ? new Date(lastRecord.date) : null;
  return await upsertStreak(userId, 'prayer', streak, lastDate);
}

/**
 * Update quran reading streak
 */
async function updateQuranStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const streak = await calculateStreak(
    userId,
    'quran_reading',
    () => getQuranActivityDates(userId),
    isFemaleMaintain
  );

  const lastRecord = await QuranReading.findOne({ user_id: userId }).sort({ date: -1 });
  const lastDate = lastRecord ? new Date(lastRecord.date) : null;
  return await upsertStreak(userId, 'quran_reading', streak, lastDate);
}

/**
 * Update dhikr streak
 */
async function updateDhikrStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const streak = await calculateStreak(
    userId,
    'dhikr',
    () => getDhikrActivityDates(userId),
    isFemaleMaintain
  );

  const lastRecord = await DhikrTracking.findOne({ user_id: userId }).sort({ date: -1 });
  const lastDate = lastRecord ? new Date(lastRecord.date) : null;
  return await upsertStreak(userId, 'dhikr', streak, lastDate);
}

/**
 * Update morning adhkar streak
 */
async function updateMorningAdhkarStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const streak = await calculateStreak(
    userId,
    'morning_adhkar',
    () => getMorningAdhkarActivityDates(userId),
    isFemaleMaintain
  );

  const lastRecord = await AdhkarTracking.findOne({ user_id: userId, morning: true }).sort({ date: -1 });
  const lastDate = lastRecord ? new Date(lastRecord.date) : null;
  return await upsertStreak(userId, 'morning_adhkar', streak, lastDate);
}

/**
 * Update evening adhkar streak
 */
async function updateEveningAdhkarStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const streak = await calculateStreak(
    userId,
    'evening_adhkar',
    () => getEveningAdhkarActivityDates(userId),
    isFemaleMaintain
  );

  const lastRecord = await AdhkarTracking.findOne({ user_id: userId, evening: true }).sort({ date: -1 });
  const lastDate = lastRecord ? new Date(lastRecord.date) : null;
  return await upsertStreak(userId, 'evening_adhkar', streak, lastDate);
}

/**
 * Update combined streak (prayer OR quran OR dhikr)
 */
async function updateCombinedStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const [prayerDates, quranDates, dhikrDates] = await Promise.all([
    getPrayerActivityDates(userId),
    getQuranActivityDates(userId),
    getDhikrActivityDates(userId),
  ]);

  const combined = new Set([...prayerDates, ...quranDates, ...dhikrDates]);

  const streak = await calculateStreak(
    userId,
    'combined',
    () => Array.from(combined),
    isFemaleMaintain
  );

  const allDates = Array.from(combined).sort();
  const lastDateStr = allDates[allDates.length - 1];
  const lastDate = lastDateStr ? new Date(lastDateStr) : null;
  return await upsertStreak(userId, 'combined', streak, lastDate);
}

/**
 * Update the FR §21 personal-goals streak
 */
async function updatePersonalGoalsStreak(userId) {
  const user = await require('../models').User.findById(userId);
  const isFemaleMaintain =
    user && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const { streak, lastActivityDate } = await calculatePersonalGoalsStreak(userId, isFemaleMaintain);
  return await upsertStreak(userId, 'personal_goals', streak, lastActivityDate);
}

/**
 * Update all streaks for a user
 */
async function updateAllStreaks(userId) {
  const [prayer, quran, dhikr, morningAdhkar, eveningAdhkar, combined, personalGoals] = await Promise.all([
    updatePrayerStreak(userId),
    updateQuranStreak(userId),
    updateDhikrStreak(userId),
    updateMorningAdhkarStreak(userId),
    updateEveningAdhkarStreak(userId),
    updateCombinedStreak(userId),
    updatePersonalGoalsStreak(userId),
  ]);
  return {
    prayer,
    quran,
    dhikr,
    morning_adhkar: morningAdhkar,
    evening_adhkar: eveningAdhkar,
    combined,
    personal_goals: personalGoals,
  };
}

/**
 * Get all streak records for a user (no recalculation)
 */
async function getAllStreaks(userId) {
  const streaks = await Streak.find({ user_id: userId });
  const result = {};
  for (const s of streaks) {
    result[s.streak_type] = {
      current: s.current_streak,
      longest: s.longest_streak,
      lastDate: s.last_activity_date,
    };
  }
  return result;
}

module.exports = {
  updatePrayerStreak,
  updateQuranStreak,
  updateDhikrStreak,
  updateMorningAdhkarStreak,
  updateEveningAdhkarStreak,
  updateCombinedStreak,
  updatePersonalGoalsStreak,
  updateAllStreaks,
  getAllStreaks,
};
