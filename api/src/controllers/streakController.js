const { Streak } = require('../models');
const { updateAllStreaks } = require('../services/streakService');

async function getAllStreaksController(req, res, next) {
  try {
    const userId = req.user._id;
    const streaks = await Streak.find({ user_id: userId });

    const result = {};
    for (const s of streaks) {
      result[s.streak_type] = {
        current: s.current_streak,
        longest: s.longest_streak,
        lastDate: s.last_activity_date,
      };
    }

    // Ensure all 4 types exist
    for (const type of ['prayer', 'quran_reading', 'dhikr', 'combined']) {
      if (!result[type]) {
        result[type] = { current: 0, longest: 0, lastDate: null };
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getStreakByType(req, res, next) {
  try {
    const userId = req.user._id;
    const { type } = req.params;

    const streak = await Streak.findOne({ user_id: userId, streak_type: type });
    if (!streak) {
      return res.status(200).json({
        type,
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
      });
    }

    return res.status(200).json({
      type: streak.streak_type,
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_activity_date: streak.last_activity_date,
    });
  } catch (err) {
    next(err);
  }
}

async function updateAllStreaksController(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await updateAllStreaks(userId);

    const formatted = {};
    for (const [key, s] of Object.entries(result)) {
      if (s) {
        formatted[key] = {
          current: s.current_streak,
          longest: s.longest_streak,
          lastDate: s.last_activity_date,
        };
      }
    }

    return res.status(200).json(formatted);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllStreaksController, getStreakByType, updateAllStreaksController };
