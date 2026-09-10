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
 * Which prayers the user is exempt from, per day, in [startDate, endDate].
 *
 * Returns a Map of day string to a Set of prayer names. A day absent from the
 * map has no exemption at all.
 *
 * A cycle is a window between two moments, so the day it begins and the day it
 * ends are usually only partly exempt — prayers offered before it started, or
 * after it ended, are ordinary prayers and count like any other. Only the app
 * knows the user's prayer times, so it works those two days out and stores the
 * answer on the record as `boundary_exemptions`.
 *
 * Where a boundary day has no stored answer — every record written before this
 * existed — the whole day is treated as exempt, which is what those records
 * have always meant.
 */
async function getExemptPrayers(userId, startDate, endDate) {
  const user = await User.findById(userId);
  const exemptionEnabled =
    user && user.gender === 'f' && user.settings && user.settings.female_settings &&
    user.settings.female_settings.maintain_streaks_during_period === true;

  const byDay = new Map();
  if (!exemptionEnabled) return byDay;

  const periods = await PeriodTracking.find({
    user_id: userId,
    start_date: { $lte: endDate },
    end_date: { $gte: startDate },
  });

  // Clamp to today: an in-progress cycle carries a provisional end date, so
  // days that have not happened yet must not be counted as exempt.
  const today = getCurrentDate();
  const rangeEnd = endDate < today ? endDate : today;

  const addAll = (day) => {
    const set = byDay.get(day) || new Set();
    FARDH_PRAYERS.forEach((p) => set.add(p));
    byDay.set(day, set);
  };

  for (const p of periods) {
    const from = p.start_date > startDate ? p.start_date : startDate;
    const to = p.end_date < rangeEnd ? p.end_date : rangeEnd;
    if (from > to) continue;

    const boundaries = (p.boundary_exemptions && typeof p.boundary_exemptions === 'object')
      ? p.boundary_exemptions
      : {};

    for (const day of getDaysBetweenDates(from, to)) {
      const isBoundary = day === p.start_date || day === p.end_date;
      const listed = boundaries[day];

      if (isBoundary && Array.isArray(listed)) {
        // Exactly the prayers the app said fell inside the window.
        const set = byDay.get(day) || new Set();
        listed.forEach((name) => set.add(String(name).toLowerCase()));
        byDay.set(day, set);
      } else {
        addAll(day);
      }
    }
  }

  return byDay;
}

/**
 * Days touched by a cycle. Kept for the "N days exempt" figures, which count a
 * partly-exempt boundary day the same as a full one.
 */
async function getExemptDays(userId, startDate, endDate) {
  const byDay = await getExemptPrayers(userId, startDate, endDate);
  return new Set(byDay.keys());
}

/** Whether one specific prayer on one day is exempt. */
function isPrayerExempt(byDay, day, prayerName) {
  const set = byDay.get(day);
  return !!set && set.has(prayerName);
}

// ── Per-metric collectors ────────────────────────────────────────────
//
// Each returns a plain number for the window. Exempt days are skipped for
// obligation-based metrics (prayers) but not for voluntary ones — a woman on
// her cycle who reads Qur'an still gets the credit.

async function countPrayers(userId, startDate, endDate, modes) {
  const [records, exemptByDay] = await Promise.all([
    PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
    getExemptPrayers(userId, startDate, endDate),
  ]);
  let count = 0;
  for (const record of records) {
    const fp = record.fardh_prayers || {};
    for (const p of FARDH_PRAYERS) {
      // A prayer offered outside the cycle counts like any other, even on the
      // day the cycle began or ended.
      if (isPrayerExempt(exemptByDay, record.date, p)) continue;
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
  getExemptPrayers,
  isPrayerExempt,
  computeMetric,
  computeMetrics,
  countGoodDeeds,
  countPrayers,
  METRIC_KEYS: Object.keys(COLLECTORS),
};
