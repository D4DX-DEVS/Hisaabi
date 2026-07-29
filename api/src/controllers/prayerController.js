const { PrayerTracking, ActivityLog } = require('../models');
const { queueStreakUpdate } = require('../services/streakQueueService');
const { getCurrentDate, getDaysBetweenDates, getMonthDateRange } = require('../utils/dateUtils');

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

async function updateFardhPrayer(req, res, next) {
  try {
    const userId = req.user._id;
    const { prayer_name, completed, mode, date } = req.body;
    const targetDate = date || getCurrentDate();

    if (!prayer_name || completed === undefined) {
      return res.status(400).json({ error: 'prayer_name and completed are required' });
    }
    if (!FARDH_PRAYERS.includes(prayer_name)) {
      return res.status(400).json({ error: `Invalid prayer name. Must be one of: ${FARDH_PRAYERS.join(', ')}` });
    }

    let record = await PrayerTracking.findOne({ user_id: userId, date: targetDate });
    if (!record) {
      record = new PrayerTracking({ user_id: userId, date: targetDate, fardh_prayers: {}, sunnah_prayers: {} });
    }

    const fp = record.fardh_prayers ? { ...record.fardh_prayers } : {};
    fp[prayer_name] = completed === true || completed === 'true';

    if (completed === true || completed === 'true') {
      if (mode && ['j', 'ot', 'l'].includes(mode)) {
        fp[`${prayer_name}_m`] = mode;
      }
    } else {
      delete fp[`${prayer_name}_m`];
    }

    record.fardh_prayers = fp;
    record.markModified('fardh_prayers');
    await record.save();

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
    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({ error: 'count must be a non-negative integer' });
    }

    let record = await PrayerTracking.findOne({ user_id: userId, date: targetDate });
    if (!record) {
      record = new PrayerTracking({ user_id: userId, date: targetDate, fardh_prayers: {}, sunnah_prayers: {} });
    }

    const sp = record.sunnah_prayers ? { ...record.sunnah_prayers } : {};
    sp[prayer_name] = count;
    record.sunnah_prayers = sp;
    record.markModified('sunnah_prayers');
    await record.save();

    // Log activity
    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'prayer',
      details: { prayer_type: 'sunnah', prayer_name, count },
    }).catch(() => {});

    queueStreakUpdate(userId, 'prayer');
    queueStreakUpdate(userId, 'combined');

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

    const prayerStats = {};
    for (const p of FARDH_PRAYERS) {
      prayerStats[p] = { total: totalDays, completed: 0, jamaat: 0, ontime: 0, late: 0, missed: 0 };
    }

    for (const record of records) {
      const fp = record.fardh_prayers || {};
      for (const p of FARDH_PRAYERS) {
        if (fp[p] === true) {
          prayerStats[p].completed++;
          const mode = fp[`${p}_m`];
          if (mode === 'j') prayerStats[p].jamaat++;
          else if (mode === 'ot') prayerStats[p].ontime++;
          else if (mode === 'l') prayerStats[p].late++;
        }
      }
    }

    for (const p of FARDH_PRAYERS) {
      prayerStats[p].missed = totalDays - prayerStats[p].completed;
      const total = prayerStats[p].total;
      prayerStats[p].percentages = {
        jamaat: total ? Math.round((prayerStats[p].jamaat / total) * 100) : 0,
        ontime: total ? Math.round((prayerStats[p].ontime / total) * 100) : 0,
        late: total ? Math.round((prayerStats[p].late / total) * 100) : 0,
        missed: total ? Math.round((prayerStats[p].missed / total) * 100) : 0,
      };
    }

    const totalPrayers = totalDays * 5;
    const overall = { total_prayers: totalPrayers, completed: 0, jamaat: 0, ontime: 0, late: 0, missed: 0 };
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
      analysis: { overall, prayers: prayerStats },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPrayerTracking, updateFardhPrayer, updateSunnahPrayer, getFardhPrayerAnalysis };
