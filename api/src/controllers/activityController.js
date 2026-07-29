const {
  PrayerTracking,
  QuranReading,
  DhikrTracking,
  FastingDay,
  DuaMemorization,
  QuranMemorization,
  PeriodTracking,
} = require('../models');
const { getAllStreaks } = require('../services/streakService');
const { getCurrentDate, getDaysBetweenDates, getMonthDateRange } = require('../utils/dateUtils');

async function getTodayProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();

    const [prayer, quranReading, dhikr, fasting, dua, quranMem, streaks] = await Promise.all([
      PrayerTracking.findOne({ user_id: userId, date }),
      QuranReading.findOne({ user_id: userId, date }),
      DhikrTracking.findOne({ user_id: userId, date }),
      FastingDay.findOne({ user_id: userId, date }),
      DuaMemorization.findOne({ user_id: userId }),
      QuranMemorization.findOne({ user_id: userId }),
      getAllStreaks(userId),
    ]);

    // Check if today is a period day
    let is_period = false;
    if (req.user.gender === 'f') {
      const periodRecord = await PeriodTracking.findOne({
        user_id: userId,
        start_date: { $lte: date },
        end_date: { $gte: date },
      });
      is_period = !!periodRecord;
    }

    return res.status(200).json({
      date,
      prayers: {
        fardh: prayer ? prayer.fardh_prayers : {},
        sunnah: prayer ? prayer.sunnah_prayers : {},
      },
      quran: {
        pages_read: quranReading ? quranReading.pages_read : [],
        pages_count: quranReading ? quranReading.pages_read.length : 0,
        memorized_ayahs: quranMem ? quranMem.memorized_ayahs.map((a) => a.ayah_key) : [],
      },
      dhikr: {
        counts: dhikr ? dhikr.dhikr_counts : {},
        total: dhikr
          ? Object.values(dhikr.dhikr_counts || {}).reduce((s, v) => s + v, 0)
          : 0,
      },
      fasting: fasting
        ? { type: fasting.fasting_type, status: fasting.status }
        : null,
      duas: dua ? dua.memorized_duas.map((d) => d.dua_id) : [],
      streaks,
      is_period,
    });
  } catch (err) {
    next(err);
  }
}

async function getActivityCalendar(req, res, next) {
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
      return res.status(400).json({
        error: 'Either start_date & end_date, or year & month are required',
      });
    }

    const days = getDaysBetweenDates(startDate, endDate);

    const [prayerRecords, quranRecords, dhikrRecords, fastingRecords] = await Promise.all([
      PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
      QuranReading.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
      DhikrTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
      FastingDay.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
    ]);

    const prayerDays = new Set(
      prayerRecords
        .filter((r) =>
          ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].some((p) => (r.fardh_prayers || {})[p] === true)
        )
        .map((r) => r.date)
    );
    const quranDays = new Set(
      quranRecords.filter((r) => r.pages_read && r.pages_read.length > 0).map((r) => r.date)
    );
    const dhikrDays = new Set(
      dhikrRecords
        .filter((r) => Object.values(r.dhikr_counts || {}).some((v) => v > 0))
        .map((r) => r.date)
    );
    const fastingDays = new Set(fastingRecords.map((r) => r.date));

    const activity_days = {};
    for (const day of days) {
      activity_days[day] = {
        prayer: prayerDays.has(day),
        quran: quranDays.has(day),
        dhikr: dhikrDays.has(day),
        fasting: fastingDays.has(day),
      };
    }

    return res.status(200).json({
      start_date: startDate,
      end_date: endDate,
      year: yr || null,
      month: mo || null,
      activity_days,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTodayProgress, getActivityCalendar };
