const {
  PrayerTracking,
  QuranReading,
  DhikrTracking,
  FastingDay,
  DuaMemorization,
  QuranMemorization,
} = require('../models');
const { getDaysBetweenDates, getMonthDateRange, formatDate } = require('../utils/dateUtils');

async function getDailyReport(userId, date) {
  const [prayer, quranReading, dhikr, fasting, dua, quranMem] = await Promise.all([
    PrayerTracking.findOne({ user_id: userId, date }),
    QuranReading.findOne({ user_id: userId, date }),
    DhikrTracking.findOne({ user_id: userId, date }),
    FastingDay.findOne({ user_id: userId, date }),
    DuaMemorization.findOne({ user_id: userId }),
    QuranMemorization.findOne({ user_id: userId }),
  ]);

  return {
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
  };
}

async function getWeeklyReport(userId, startDate, endDate) {
  const days = getDaysBetweenDates(startDate, endDate);
  const reports = await Promise.all(days.map((d) => getDailyReport(userId, d)));
  return { start_date: startDate, end_date: endDate, daily: reports };
}

async function getMonthlyReport(userId, year, month) {
  const { start_date, end_date } = getMonthDateRange(year, month);
  return getWeeklyReport(userId, start_date, end_date);
}

async function getYearlyReport(userId, year) {
  const start_date = `${year}-01-01`;
  const end_date = `${year}-12-31`;
  return getWeeklyReport(userId, start_date, end_date);
}

module.exports = { getDailyReport, getWeeklyReport, getMonthlyReport, getYearlyReport };
