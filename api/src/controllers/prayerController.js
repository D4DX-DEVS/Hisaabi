const { PrayerTracking, ActivityLog, User, PeriodTracking } = require('../models');
const { queueStreakUpdate } = require('../services/streakQueueService');
const { getCurrentDate, getDaysBetweenDates, getMonthDateRange } = require('../utils/dateUtils');
const { isYmd } = require('../utils/inputGuard');
const { getExemptPrayers, isPrayerExempt } = require('../services/worshipMetrics');

const FARDH_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

async function getPrayerTracking(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();

    const record = await PrayerTracking.findOne({ user_id: userId, date });
    return res.status(200).json({
      date,
      fardh_prayers: record ? record.fardh_prayers : {},
      sunnah_prayers: record ? record.sunnah_prayers : {},
    });
  } catch (err) {
    next(err);
  }
}

// One atomic upsert per tap: two taps at once cannot overwrite each other's
// field, and the unique (user, date) index makes a racing insert retry as an update.
async function upsertPrayer(userId, date, set, unset) {
  const update = { $set: set };
  if (Object.keys(unset).length) update.$unset = unset;
  const opts = { upsert: true, new: true };
  try {
    return await PrayerTracking.findOneAndUpdate({ user_id: userId, date }, update, opts);
  } catch (err) {
    if (err && err.code === 11000) {
      return PrayerTracking.findOneAndUpdate({ user_id: userId, date }, update, opts);
    }
    throw err;
  }
}

const NAME_RE = /^[A-Za-z0-9_]{1,40}$/;

async function updateFardhPrayer(req, res, next) {
  try {
    const userId = req.user._id;
    const { prayer_name, completed, mode, date } = req.body;
    const targetDate = date || getCurrentDate();

    if (!prayer_name || completed === undefined) {
      return res.status(400).json({ error: 'prayer_name and completed are required' });
    }
    if (!isYmd(targetDate)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    if (!FARDH_PRAYERS.includes(prayer_name)) {
      return res.status(400).json({ error: `Invalid prayer name. Must be one of: ${FARDH_PRAYERS.join(', ')}` });
    }

    const done = completed === true || completed === 'true';
    const set = { [`fardh_prayers.${prayer_name}`]: done };
    const unset = {};
    if (done) {
      if (mode && ['j', 'ot', 'l', 'q'].includes(mode)) set[`fardh_prayers.${prayer_name}_m`] = mode;
    } else {
      unset[`fardh_prayers.${prayer_name}_m`] = '';
    }
    const record = await upsertPrayer(userId, targetDate, set, unset);
    const fp = record.fardh_prayers;

    // Log activity
    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'prayer',
      details: { prayer_type: 'fardh', prayer_name, completed: fp[prayer_name] },
    }).catch(() => {});

    // Queue streak updates
    queueStreakUpdate(userId, 'prayer');
    queueStreakUpdate(userId, 'combined');
    queueStreakUpdate(userId, 'personal_goals');

    return res.status(200).json({
      success: true,
      date: targetDate,
      fardh_prayers: record.fardh_prayers,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSunnahPrayer(req, res, next) {
  try {
    const userId = req.user._id;
    const { prayer_name, count, date } = req.body;
    const targetDate = date || getCurrentDate();

    if (!prayer_name || count === undefined) {
      return res.status(400).json({ error: 'prayer_name and count are required' });
    }
    if (!isYmd(targetDate)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    if (typeof prayer_name !== 'string' || !NAME_RE.test(prayer_name)) {
      return res.status(400).json({ error: 'invalid prayer_name' });
    }
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      return res.status(400).json({ error: 'count must be a non-negative integer' });
    }

    const record = await upsertPrayer(userId, targetDate, { [`sunnah_prayers.${prayer_name}`]: count }, {});

    // Log activity
    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'prayer',
      details: { prayer_type: 'sunnah', prayer_name, count },
    }).catch(() => {});

    queueStreakUpdate(userId, 'prayer');
    queueStreakUpdate(userId, 'combined');
    queueStreakUpdate(userId, 'personal_goals');

    return res.status(200).json({
      success: true,
      date: targetDate,
      sunnah_prayers: record.sunnah_prayers,
    });
  } catch (err) {
    next(err);
  }
}

async function getFardhPrayerAnalysis(req, res, next) {
  try {
    const userId = req.user._id;
    const { start_date, end_date, year, month } = req.query;

    let startDate, endDate, yr, mo;

    if (start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
    } else if (year && month) {
      yr = parseInt(year);
      mo = parseInt(month);
      const range = getMonthDateRange(yr, mo);
      startDate = range.start_date;
      endDate = range.end_date;
    } else {
      return res.status(400).json({ error: 'Either start_date & end_date, or year & month are required' });
    }

    const records = await PrayerTracking.find({
      user_id: userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const days = getDaysBetweenDates(startDate, endDate);
    const totalDays = days.length;
    const exemptByDay = await getExemptPrayers(userId, startDate, endDate);
    const eligibleDays = totalDays - exemptByDay.size;

    const recordsByDate = {};
    for (const record of records) recordsByDate[record.date] = record;

    const prayerStats = {};
    for (const p of FARDH_PRAYERS) {
      prayerStats[p] = { total: 0, exempt: 0, completed: 0, jamaat: 0, ontime: 0, late: 0, missed: 0 };
    }

    for (const day of days) {
      const fp = (recordsByDate[day] && recordsByDate[day].fardh_prayers) || {};
      for (const p of FARDH_PRAYERS) {
        const wasCompleted = fp[p] === true;
        // Exemption is per prayer, not per day: on the day a cycle began or
        // ended, only the prayers that actually fell inside the window are
        // excluded. A prayer mark inside that window is overridden too — a
        // cycle logged several days late means those days were likely marked
        // before she recorded it, and exemption wins over a stray mark.
        if (isPrayerExempt(exemptByDay, day, p)) {
          prayerStats[p].exempt++;
          continue;
        }
        prayerStats[p].total++;
        if (wasCompleted) {
          prayerStats[p].completed++;
          const mode = fp[`${p}_m`];
          if (mode === 'j') prayerStats[p].jamaat++;
          else if (mode === 'ot') prayerStats[p].ontime++;
          else if (mode === 'l') prayerStats[p].late++;
        }
      }
    }

    for (const p of FARDH_PRAYERS) {
      prayerStats[p].missed = prayerStats[p].total - prayerStats[p].completed;
      const total = prayerStats[p].total;
      prayerStats[p].percentages = {
        jamaat: total ? Math.round((prayerStats[p].jamaat / total) * 100) : 0,
        ontime: total ? Math.round((prayerStats[p].ontime / total) * 100) : 0,
        late: total ? Math.round((prayerStats[p].late / total) * 100) : 0,
        missed: total ? Math.round((prayerStats[p].missed / total) * 100) : 0,
      };
    }

    const totalPrayers = FARDH_PRAYERS.reduce((sum, p) => sum + prayerStats[p].total, 0);
    const totalExemptPrayers = FARDH_PRAYERS.reduce((sum, p) => sum + prayerStats[p].exempt, 0);
    const overall = { total_prayers: totalPrayers, exempt_prayers: totalExemptPrayers, completed: 0, jamaat: 0, ontime: 0, late: 0, missed: 0 };
    for (const p of FARDH_PRAYERS) {
      overall.completed += prayerStats[p].completed;
      overall.jamaat += prayerStats[p].jamaat;
      overall.ontime += prayerStats[p].ontime;
      overall.late += prayerStats[p].late;
      overall.missed += prayerStats[p].missed;
    }
    overall.percentages = {
      jamaat: totalPrayers ? Math.round((overall.jamaat / totalPrayers) * 100) : 0,
      ontime: totalPrayers ? Math.round((overall.ontime / totalPrayers) * 100) : 0,
      late: totalPrayers ? Math.round((overall.late / totalPrayers) * 100) : 0,
      missed: totalPrayers ? Math.round((overall.missed / totalPrayers) * 100) : 0,
    };

    return res.status(200).json({
      start_date: startDate,
      end_date: endDate,
      year: yr || null,
      month: mo || null,
      eligible_days: eligibleDays,
      exempt_days: exemptByDay.size,
      analysis: { overall, prayers: prayerStats },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPrayerTracking, updateFardhPrayer, updateSunnahPrayer, getFardhPrayerAnalysis };
