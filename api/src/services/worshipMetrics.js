const {
  User,
  PeriodTracking,
  PrayerTracking,
  QuranReading,
  QuranMemorization,
  DhikrTracking,
  FastingDay,
  AdhkarTracking,
  DuaTracking,
  GoodDeedLog,
} = require('../models');
const { getCurrentDate, getDaysBetweenDates } = require('../utils/dateUtils');

const FARDH_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Days in [startDate, endDate] on which the user is exempt from prayer
 * accountability because Personal Cycle was active.
 *
 * Only applies when the user opted into the feature; an in-progress cycle is
 * clamped to today so future provisional days are never pre-counted.
 */
async function getExemptDays(userId, startDate, endDate) {
  const user = await User.findById(userId);
  const exemptionEnabled =
    user && user.gender === 'f' && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  if (!exemptionEnabled) return new Set();

  const periods = await PeriodTracking.find({
    user_id: userId,
    start_date: { $lte: endDate },
    end_date: { $gte: startDate },
  });

  const today = getCurrentDate();
  const rangeEnd = endDate < today ? endDate : today;

  const exemptDays = new Set();
  for (const p of periods) {
    const start = p.start_date > startDate ? p.start_date : startDate;
    const end = p.end_date < rangeEnd ? p.end_date : rangeEnd;
    if (start > end) continue;
    getDaysBetweenDates(start, end).forEach((d) => exemptDays.add(d));
  }
  return exemptDays;
}

// ── Per-metric collectors ────────────────────────────────────────────
//
// Each returns a plain number for the window. Exempt days are skipped for
// obligation-based metrics (prayers) but not for voluntary ones — a woman on
// her cycle who reads Qur'an still gets the credit.

async function countPrayers(userId, startDate, endDate, modes) {
  const [records, exemptDays] = await Promise.all([
    PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
    getExemptDays(userId, startDate, endDate),
  ]);
  let count = 0;
  for (const record of records) {
    if (exemptDays.has(record.date)) continue;
    const fp = record.fardh_prayers || {};
    for (const p of FARDH_PRAYERS) {
      if (fp[p] !== true) continue;
      const mode = fp[`${p}_m`];
      if (!modes || modes.includes(mode)) count++;
    }
  }
  return count;
}

async function sumQuranPages(userId, startDate, endDate) {
  const records = await QuranReading.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => sum + (r.pages_read ? r.pages_read.length : 0), 0);
}

async function sumQuranMinutes(userId, startDate, endDate) {
  const records = await QuranReading.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
}

async function countQuranAyahs(userId, startDate, endDate) {
  const mem = await QuranMemorization.findOne({ user_id: userId });
  if (!mem || !mem.memorized_ayahs) return 0;
  return mem.memorized_ayahs.filter((a) => {
    if (!a.memorized_at) return false;
    const d = new Date(a.memorized_at).toISOString().split('T')[0];
    return d >= startDate && d <= endDate;
  }).length;
}

async function sumDhikr(userId, startDate, endDate) {
  const records = await DhikrTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => {
    const counts = r.dhikr_counts || {};
    return sum + Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
  }, 0);
}

async function countSunnahPrayers(userId, startDate, endDate) {
  const records = await PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => {
    const sp = r.sunnah_prayers || {};
    return sum + Object.values(sp).reduce((s, v) => s + (v === true ? 1 : Number(v) || 0), 0);
  }, 0);
}

async function countFastingDays(userId, startDate, endDate) {
  return FastingDay.countDocuments({
    user_id: userId,
    date: { $gte: startDate, $lte: endDate },
    status: 'completed',
  });
}

async function countAdhkarSessions(userId, startDate, endDate) {
  const records = await AdhkarTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => {
    let n = (r.morning ? 1 : 0) + (r.evening ? 1 : 0);
    for (const p of r.personal || []) {
      if (p && p.target && Number(p.count) >= Number(p.target)) n++;
    }
    return sum + n;
  }, 0);
}

async function countDuaCompletions(userId, startDate, endDate) {
  const records = await DuaTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } });
  return records.reduce((sum, r) => sum + (r.completed_duas ? r.completed_duas.length : 0), 0);
}

async function countGoodDeeds(userId, startDate, endDate, category) {
  const query = { user_id: userId, date: { $gte: startDate, $lte: endDate } };
  if (category) query.category = category;
  const records = await GoodDeedLog.find(query);
  return records.reduce((sum, r) => sum + (r.count || 0), 0);
}

async function sumLearningMinutes(userId, startDate, endDate) {
  const records = await GoodDeedLog.find({
    user_id: userId,
    date: { $gte: startDate, $lte: endDate },
    category: 'learning',
  });
  return records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
}

const COLLECTORS = {
  prayers_ontime: (u, s, e) => countPrayers(u, s, e, ['j', 'ot']),
  prayers_jamaah: (u, s, e) => countPrayers(u, s, e, ['j']),
  prayers_qada: (u, s, e) => countPrayers(u, s, e, ['q']),
  quran_pages: sumQuranPages,
  quran_ayahs: countQuranAyahs,
  quran_minutes: sumQuranMinutes,
  dhikr_count: sumDhikr,
  sunnah_prayers: countSunnahPrayers,
  fasting_days: countFastingDays,
  adhkar_sessions: countAdhkarSessions,
  dua_completions: countDuaCompletions,
  good_deeds: (u, s, e) => countGoodDeeds(u, s, e, null),
  learning_minutes: sumLearningMinutes,
};

/**
 * Compute a single metric for one user over an inclusive date window.
 * Unknown metrics (including 'manual') return 0 — the caller supplies those.
 */
async function computeMetric(userId, metric, startDate, endDate) {
  const collector = COLLECTORS[metric];
  if (!collector) return 0;
  return collector(userId, startDate, endDate);
}

/**
 * Compute several metrics for one user in parallel.
 * Returns { [metric]: number }.
 */
async function computeMetrics(userId, metrics, startDate, endDate) {
  const unique = [...new Set(metrics)].filter((m) => COLLECTORS[m]);
  const values = await Promise.all(unique.map((m) => computeMetric(userId, m, startDate, endDate)));
  const out = {};
  unique.forEach((m, i) => { out[m] = values[i]; });
  return out;
}

module.exports = {
  FARDH_PRAYERS,
  getExemptDays,
  computeMetric,
  computeMetrics,
  countGoodDeeds,
  countPrayers,
  METRIC_KEYS: Object.keys(COLLECTORS),
};
