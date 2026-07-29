const { v4: uuidv4 } = require('uuid');
const { User, QuranReading, DhikrTracking, PrayerTracking, QuranMemorization } = require('../models');
const { getCurrentDate, getDaysBetweenDates, getMonthDateRange } = require('../utils/dateUtils');

// ── Goal Settings ────────────────────────────────────────────────────

async function getGoalSettings(req, res, next) {
  try {
    const goals = (req.user.settings && req.user.settings.goals) || {};
    return res.status(200).json(goals);
  } catch (err) {
    next(err);
  }
}

async function updateGoalSettings(req, res, next) {
  try {
    const user = req.user;
    const { goals } = req.body;
    if (!goals || typeof goals !== 'object') {
      return res.status(400).json({ error: 'goals object is required' });
    }

    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    settings.goals = { ...(settings.goals || {}), ...goals };
    user.settings = settings;
    user.markModified('settings');
    await user.save();

    return res.status(200).json(user.settings.goals);
  } catch (err) {
    next(err);
  }
}

async function removeGoalSettingsKeys(req, res, next) {
  try {
    const user = req.user;
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys array is required' });
    }

    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    const goals = settings.goals || {};
    for (const k of keys) delete goals[k];
    settings.goals = goals;
    user.settings = settings;
    user.markModified('settings');
    await user.save();

    return res.status(200).json(user.settings.goals);
  } catch (err) {
    next(err);
  }
}

// ── Goal Progress ────────────────────────────────────────────────────

async function computeGoalProgress(userId, date, goals) {
  const [quranReading, dhikr, prayer] = await Promise.all([
    QuranReading.findOne({ user_id: userId, date }),
    DhikrTracking.findOne({ user_id: userId, date }),
    PrayerTracking.findOne({ user_id: userId, date }),
  ]);

  // Quran memorization for the date (count ayahs memorized on or before date)
  const quranMem = await QuranMemorization.findOne({ user_id: userId });
  const ayahsOnDate = quranMem
    ? quranMem.memorized_ayahs.filter((a) => {
        const d = new Date(a.memorized_at);
        return d.toISOString().split('T')[0] === date;
      }).length
    : 0;

  const progress = {};
  if (goals.quran_pages !== undefined) {
    const current = quranReading ? quranReading.pages_read.length : 0;
    progress.quran_pages = {
      goal: goals.quran_pages,
      current,
      completed: current >= goals.quran_pages,
      percentage: goals.quran_pages > 0 ? Math.min(100, Math.round((current / goals.quran_pages) * 100)) : 0,
    };
  }
  if (goals.quran_ayahs !== undefined) {
    progress.quran_ayahs = {
      goal: goals.quran_ayahs,
      current: ayahsOnDate,
      completed: ayahsOnDate >= goals.quran_ayahs,
      percentage: goals.quran_ayahs > 0 ? Math.min(100, Math.round((ayahsOnDate / goals.quran_ayahs) * 100)) : 0,
    };
  }
  if (goals.dhikr_count !== undefined) {
    const current = dhikr ? Object.values(dhikr.dhikr_counts || {}).reduce((s, v) => s + v, 0) : 0;
    progress.dhikr_count = {
      goal: goals.dhikr_count,
      current,
      completed: current >= goals.dhikr_count,
      percentage: goals.dhikr_count > 0 ? Math.min(100, Math.round((current / goals.dhikr_count) * 100)) : 0,
    };
  }
  if (goals.sunnah_prayers !== undefined) {
    const current = prayer
      ? Object.values(prayer.sunnah_prayers || {}).reduce((s, v) => s + v, 0)
      : 0;
    progress.sunnah_prayers = {
      goal: goals.sunnah_prayers,
      current,
      completed: current >= goals.sunnah_prayers,
      percentage: goals.sunnah_prayers > 0 ? Math.min(100, Math.round((current / goals.sunnah_prayers) * 100)) : 0,
    };
  }

  const total_goals = Object.keys(progress).length;
  const completed_goals = Object.values(progress).filter((p) => p.completed).length;
  const overall_percentage = total_goals > 0 ? Math.round((completed_goals / total_goals) * 100) : 0;

  return {
    progress,
    overall_progress: { total_goals, completed_goals, percentage: overall_percentage },
  };
}

async function getGoalProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();
    const goals = (req.user.settings && req.user.settings.goals) || {};

    const { progress, overall_progress } = await computeGoalProgress(userId, date, goals);

    return res.status(200).json({ date, goals, progress, overall_progress });
  } catch (err) {
    next(err);
  }
}

async function getGoalProgressCalendar(req, res, next) {
  try {
    const userId = req.user._id;
    const { start_date, end_date, year, month } = req.query;

    let startDate, endDate, yr, mo;
    if (start_date && end_date) {
      startDate = start_date; endDate = end_date;
    } else if (year && month) {
      yr = parseInt(year); mo = parseInt(month);
      const range = getMonthDateRange(yr, mo);
      startDate = range.start_date; endDate = range.end_date;
    } else {
      return res.status(400).json({ error: 'Either start_date & end_date, or year & month are required' });
    }

    const goals = (req.user.settings && req.user.settings.goals) || {};
    const days = getDaysBetweenDates(startDate, endDate);

    const goal_progress_days = {};
    for (const day of days) {
      const { progress, overall_progress } = await computeGoalProgress(userId, day, goals);
      goal_progress_days[day] = { ...progress, overall_progress };
    }

    return res.status(200).json({
      start_date: startDate,
      end_date: endDate,
      year: yr || null,
      month: mo || null,
      goals,
      goal_progress_days,
    });
  } catch (err) {
    next(err);
  }
}

// ── Memorization Goals ───────────────────────────────────────────────

async function getMemorizationGoals(req, res, next) {
  try {
    const userId = req.user._id;
    const { QuranMemorization } = require('../models');
    const record = await QuranMemorization.findOne({ user_id: userId });
    return res.status(200).json({ goals: record ? record.memorization_goals : [] });
  } catch (err) {
    next(err);
  }
}

async function createMemorizationGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const { surah_number, from_ayah, to_ayah, deadline } = req.body;

    if (!surah_number || !from_ayah || !to_ayah || !deadline) {
      return res.status(400).json({ error: 'surah_number, from_ayah, to_ayah, and deadline are required' });
    }
    if (from_ayah > to_ayah) {
      return res.status(400).json({ error: 'from_ayah cannot be greater than to_ayah' });
    }

    const { QuranMemorization } = require('../models');
    let record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) record = new QuranMemorization({ user_id: userId });

    const goal = {
      id: uuidv4(),
      surah_number,
      from_ayah,
      to_ayah,
      deadline: new Date(deadline).toISOString(),
      created_at: new Date().toISOString(),
      completed: false,
    };

    record.memorization_goals = [...record.memorization_goals, goal];
    record.markModified('memorization_goals');
    await record.save();

    return res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

async function updateMemorizationGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { surah_number, from_ayah, to_ayah, deadline, completed } = req.body;

    const { QuranMemorization } = require('../models');
    const record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) return res.status(404).json({ error: 'No memorization record found' });

    const idx = record.memorization_goals.findIndex((g) => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Goal not found' });

    const updated = { ...record.memorization_goals[idx] };
    if (surah_number !== undefined) updated.surah_number = surah_number;
    if (from_ayah !== undefined) updated.from_ayah = from_ayah;
    if (to_ayah !== undefined) updated.to_ayah = to_ayah;
    if (deadline !== undefined) updated.deadline = new Date(deadline).toISOString();
    if (completed !== undefined) updated.completed = completed;

    record.memorization_goals[idx] = updated;
    record.markModified('memorization_goals');
    await record.save();

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteMemorizationGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const { QuranMemorization } = require('../models');
    const record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) return res.status(404).json({ error: 'No memorization record found' });

    const idx = record.memorization_goals.findIndex((g) => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Goal not found' });

    record.memorization_goals.splice(idx, 1);
    record.markModified('memorization_goals');
    await record.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getMemorizationProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const { QuranMemorization } = require('../models');
    const record = await QuranMemorization.findOne({ user_id: userId });
    if (!record) return res.status(200).json({ goals: [], progress: [] });

    const memorizedKeys = new Set(record.memorized_ayahs.map((a) => a.ayah_key));
    const today = new Date();

    const progress = record.memorization_goals.map((g) => {
      const total_ayahs = g.to_ayah - g.from_ayah + 1;
      let memorized_count = 0;
      for (let a = g.from_ayah; a <= g.to_ayah; a++) {
        if (memorizedKeys.has(`${g.surah_number}:${a}`)) memorized_count++;
      }
      const percentage_completed = total_ayahs > 0 ? Math.round((memorized_count / total_ayahs) * 100) : 0;
      const deadline = new Date(g.deadline);
      const days_remaining = Math.max(0, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)));

      return {
        goal_id: g.id,
        surah_number: g.surah_number,
        from_ayah: g.from_ayah,
        to_ayah: g.to_ayah,
        deadline: g.deadline,
        total_ayahs,
        memorized_count,
        percentage_completed,
        is_completed: g.completed || memorized_count >= total_ayahs,
        days_remaining,
      };
    });

    return res.status(200).json({ goals: record.memorization_goals, progress });
  } catch (err) {
    next(err);
  }
}

async function getMemorizationProgressCalendar(req, res, next) {
  try {
    const userId = req.user._id;
    const { start_date, end_date, year, month } = req.query;

    let startDate, endDate, yr, mo;
    if (start_date && end_date) {
      startDate = start_date; endDate = end_date;
    } else if (year && month) {
      yr = parseInt(year); mo = parseInt(month);
      const range = getMonthDateRange(yr, mo);
      startDate = range.start_date; endDate = range.end_date;
    } else {
      return res.status(400).json({ error: 'Either start_date & end_date, or year & month are required' });
    }

    const { QuranMemorization } = require('../models');
    const record = await QuranMemorization.findOne({ user_id: userId });
    if (!record || !record.memorization_goals.length) {
      return res.status(200).json({
        start_date: startDate, end_date: endDate,
        year: yr || null, month: mo || null,
        goals: [], daily_progress: {},
      });
    }

    const days = getDaysBetweenDates(startDate, endDate);
    const daily_progress = {};

    for (const day of days) {
      // Get memorized ayahs up to and including this day
      const memorizedOnDay = new Set(
        record.memorized_ayahs
          .filter((a) => a.memorized_at.split('T')[0] === day)
          .map((a) => a.ayah_key)
      );
      const memorizedUpToDay = new Set(
        record.memorized_ayahs
          .filter((a) => a.memorized_at.split('T')[0] <= day)
          .map((a) => a.ayah_key)
      );

      const goals_progress = record.memorization_goals.map((g) => {
        const total_ayahs = g.to_ayah - g.from_ayah + 1;
        let memorized_count = 0;
        let completed_today = 0;
        for (let a = g.from_ayah; a <= g.to_ayah; a++) {
          const key = `${g.surah_number}:${a}`;
          if (memorizedUpToDay.has(key)) memorized_count++;
          if (memorizedOnDay.has(key)) completed_today++;
        }
        const percentage_completed = total_ayahs > 0 ? Math.round((memorized_count / total_ayahs) * 100) : 0;
        return {
          goal_id: g.id,
          surah_number: g.surah_number,
          from_ayah: g.from_ayah,
          to_ayah: g.to_ayah,
          percentage_completed,
          is_completed: memorized_count >= total_ayahs,
          completed_today: completed_today > 0,
        };
      });

      const avg_progress =
        goals_progress.length > 0
          ? Math.round(goals_progress.reduce((s, g) => s + g.percentage_completed, 0) / goals_progress.length)
          : 0;

      daily_progress[day] = {
        average_progress: avg_progress,
        completed_goals: goals_progress.filter((g) => g.is_completed).length,
        completed_today: goals_progress.filter((g) => g.completed_today).length,
        total_goals: goals_progress.length,
        goals_progress,
      };
    }

    return res.status(200).json({
      start_date: startDate,
      end_date: endDate,
      year: yr || null,
      month: mo || null,
      goals: record.memorization_goals,
      daily_progress,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGoalSettings,
  updateGoalSettings,
  removeGoalSettingsKeys,
  getGoalProgress,
  getGoalProgressCalendar,
  getMemorizationGoals,
  createMemorizationGoal,
  updateMemorizationGoal,
  deleteMemorizationGoal,
  getMemorizationProgress,
  getMemorizationProgressCalendar,
};
