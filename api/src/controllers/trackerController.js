const {
  PrayerTracking,
  QuranReading,
  DhikrTracking,
  FastingDay,
  AdhkarTracking,
  DuaTracking,
  GoodDeedLog,
  WorshipGoal,
  Muhasabah,
} = require('../models');
const { computeMetrics, getExemptDays, FARDH_PRAYERS } = require('../services/worshipMetrics');
const { goalWithProgress } = require('./worshipGoalController');
const { weekBounds } = require('./muhasabahController');
const { getCurrentDate, getDaysBetweenDates, getMonthDateRange } = require('../utils/dateUtils');

/**
 * Weights for the single "overall progress" number on the Today screen.
 *
 * Fardh prayers dominate deliberately: the FR frames the dashboard around
 * consistency in obligatory worship first, with voluntary acts adding on top.
 * A section the user has no data for is dropped and the remaining weights are
 * renormalised, so an untouched category never reads as failure.
 */
const SECTION_WEIGHTS = {
  prayers: 40,
  quran: 15,
  dhikr: 10,
  adhkar: 10,
  dua: 5,
  fasting: 5,
  good_deeds: 10,
  goals: 5,
};

function ratio(current, target) {
  if (!target || target <= 0) return null;
  return Math.min(1, current / target);
}

/**
 * The full Today dashboard: every worship category for one day, in one call,
 * so the tracker never has to fan out across modules to render.
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();
    const goalSettings = (req.user.settings && req.user.settings.goals) || {};

    const [
      prayerRecord,
      quranRecord,
      dhikrRecord,
      fastingRecord,
      adhkarRecord,
      duaRecord,
      deedRecords,
      goals,
      exemptDays,
    ] = await Promise.all([
      PrayerTracking.findOne({ user_id: userId, date }),
      QuranReading.findOne({ user_id: userId, date }),
      DhikrTracking.findOne({ user_id: userId, date }),
      FastingDay.findOne({ user_id: userId, date }),
      AdhkarTracking.findOne({ user_id: userId, date }),
      DuaTracking.findOne({ user_id: userId, date }),
      GoodDeedLog.find({ user_id: userId, date }),
      WorshipGoal.find({ user_id: userId, active: true }),
      getExemptDays(userId, date, date),
    ]);

    const isExempt = exemptDays.has(date);

    // ── Prayers ──
    const fp = (prayerRecord && prayerRecord.fardh_prayers) || {};
    const prayers = FARDH_PRAYERS.map((name) => ({
      name,
      completed: fp[name] === true,
      // j = jamaah, ot = on time, l = late, q = qada (made up later)
      mode: fp[`${name}_m`] || null,
    }));
    const completedPrayers = prayers.filter((p) => p.completed).length;
    const prayerSection = {
      exempt: isExempt,
      prayers,
      completed: completedPrayers,
      // On an exempt day only prayers she chose to offer are counted at all.
      total: isExempt ? completedPrayers : FARDH_PRAYERS.length,
      qada: prayers.filter((p) => p.mode === 'q').length,
      sunnah: (prayerRecord && prayerRecord.sunnah_prayers) || {},
    };

    // ── Qur'an ──
    const pagesRead = (quranRecord && quranRecord.pages_read) || [];
    const quranSection = {
      pages_read: pagesRead.length,
      pages: pagesRead,
      last_read_page: (quranRecord && quranRecord.last_read_page) || null,
      duration_minutes: (quranRecord && quranRecord.duration_minutes) || 0,
      goal: goalSettings.quran_pages || null,
    };

    // ── Dhikr ──
    const dhikrCounts = (dhikrRecord && dhikrRecord.dhikr_counts) || {};
    const dhikrTotal = Object.values(dhikrCounts).reduce((s, v) => s + (Number(v) || 0), 0);
    const dhikrSection = { total: dhikrTotal, counts: dhikrCounts, goal: goalSettings.dhikr_count || null };

    // ── Adhkar ──
    const personal = (adhkarRecord && adhkarRecord.personal) || [];
    const adhkarSection = {
      morning: (adhkarRecord && adhkarRecord.morning) || false,
      evening: (adhkarRecord && adhkarRecord.evening) || false,
      personal,
      completed:
        ((adhkarRecord && adhkarRecord.morning) ? 1 : 0) +
        ((adhkarRecord && adhkarRecord.evening) ? 1 : 0) +
        personal.filter((p) => p && p.target && Number(p.count) >= Number(p.target)).length,
      total: 2 + personal.length,
    };

    // ── Dua ──
    const selectedDuas = (duaRecord && duaRecord.selected_duas) || [];
    const completedDuas = (duaRecord && duaRecord.completed_duas) || [];
    const duaSection = {
      selected: selectedDuas,
      completed: completedDuas,
      pending: selectedDuas.filter((d) => !completedDuas.includes(d)),
    };

    // ── Fasting ──
    const fastingSection = {
      is_fasting: !!fastingRecord,
      fasting_type: fastingRecord ? fastingRecord.fasting_type : null,
      status: fastingRecord ? fastingRecord.status : null,
    };

    // ── Good deeds + Islamic learning ──
    const deeds = deedRecords.map((r) => ({
      id: r._id,
      deed_key: r.deed_key,
      label: r.label,
      category: r.category,
      count: r.count,
      notes: r.notes,
      duration_minutes: r.duration_minutes,
    }));
    const goodDeedsSection = {
      deeds: deeds.filter((d) => d.category !== 'learning'),
      total: deeds.filter((d) => d.category !== 'learning').reduce((s, d) => s + d.count, 0),
    };
    const learningSection = {
      entries: deeds.filter((d) => d.category === 'learning'),
      minutes: deeds
        .filter((d) => d.category === 'learning')
        .reduce((s, d) => s + (d.duration_minutes || 0), 0),
    };

    // ── Goals ──
    const goalProgress = await Promise.all(goals.map((g) => goalWithProgress(g, date)));
    const goalsSection = {
      goals: goalProgress,
      completed: goalProgress.filter((g) => g.completed).length,
      total: goalProgress.length,
    };

    // ── Overall ──
    const sectionRatios = {
      // An exempt day with nothing offered has no prayer obligation to score.
      prayers: prayerSection.total ? prayerSection.completed / prayerSection.total : null,
      quran: ratio(quranSection.pages_read, quranSection.goal),
      dhikr: ratio(dhikrSection.total, dhikrSection.goal),
      adhkar: adhkarSection.total ? adhkarSection.completed / adhkarSection.total : null,
      dua: selectedDuas.length ? completedDuas.length / selectedDuas.length : null,
      fasting: fastingSection.is_fasting ? (fastingSection.status === 'completed' ? 1 : 0) : null,
      good_deeds: goodDeedsSection.total > 0 ? 1 : null,
      goals: goalsSection.total ? goalsSection.completed / goalsSection.total : null,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [key, value] of Object.entries(sectionRatios)) {
      if (value === null) continue;
      weightedSum += value * SECTION_WEIGHTS[key];
      totalWeight += SECTION_WEIGHTS[key];
    }
    const overallPercent = totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;

    return res.status(200).json({
      date,
      overall_percent: overallPercent,
      is_exempt: isExempt,
      prayers: prayerSection,
      quran: quranSection,
      dhikr: dhikrSection,
      adhkar: adhkarSection,
      dua: duaSection,
      fasting: fastingSection,
      good_deeds: goodDeedsSection,
      learning: learningSection,
      goals: goalsSection,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Aggregated progress for a week or month, plus a per-day series the client
 * can chart without another round trip.
 */
async function getProgress(req, res, next) {
  try {
    const userId = req.user._id;
    const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const anchor = req.query.date || getCurrentDate();

    let startDate;
    let endDate;
    if (period === 'monthly') {
      const d = new Date(`${anchor}T00:00:00`);
      const r = getMonthDateRange(d.getFullYear(), d.getMonth() + 1);
      startDate = r.start_date;
      endDate = r.end_date;
    } else {
      const b = weekBounds(anchor);
      startDate = b.week_start;
      endDate = b.week_end;
    }

    const today = getCurrentDate();
    const effectiveEnd = endDate > today ? today : endDate;
    const days = effectiveEnd >= startDate ? getDaysBetweenDates(startDate, effectiveEnd) : [];

    const [totals, exemptDays, prayerRecords, quranRecords, deedRecords, adhkarRecords, fastingRecords] =
      await Promise.all([
        computeMetrics(
          userId,
          [
            'prayers_ontime',
            'prayers_jamaah',
            'prayers_qada',
            'quran_pages',
            'quran_minutes',
            'quran_ayahs',
            'dhikr_count',
            'sunnah_prayers',
            'fasting_days',
            'adhkar_sessions',
            'dua_completions',
            'good_deeds',
            'learning_minutes',
          ],
          startDate,
          effectiveEnd < startDate ? startDate : effectiveEnd
        ),
        getExemptDays(userId, startDate, effectiveEnd < startDate ? startDate : effectiveEnd),
        PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        QuranReading.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        GoodDeedLog.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        AdhkarTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        FastingDay.find({ user_id: userId, date: { $gte: startDate, $lte: endDate }, status: 'completed' }),
      ]);

    const prayerByDate = {};
    for (const r of prayerRecords) prayerByDate[r.date] = r;
    const quranByDate = {};
    for (const r of quranRecords) quranByDate[r.date] = r;
    const deedsByDate = {};
    for (const r of deedRecords) deedsByDate[r.date] = (deedsByDate[r.date] || 0) + (r.count || 0);
    const adhkarByDate = {};
    for (const r of adhkarRecords) adhkarByDate[r.date] = (r.morning ? 1 : 0) + (r.evening ? 1 : 0);
    const fastingDates = new Set(fastingRecords.map((r) => r.date));

    let prayerCompleted = 0;
    let prayerExpected = 0;
    const series = days.map((day) => {
      const dayExempt = exemptDays.has(day);
      const fp = (prayerByDate[day] && prayerByDate[day].fardh_prayers) || {};
      let done = 0;
      let expected = 0;
      for (const p of FARDH_PRAYERS) {
        const completed = fp[p] === true;
        if (dayExempt && !completed) continue;
        expected++;
        if (completed) done++;
      }
      prayerCompleted += done;
      prayerExpected += expected;

      return {
        date: day,
        exempt: dayExempt,
        prayers_completed: done,
        prayers_expected: expected,
        prayer_percent: expected ? Math.round((done / expected) * 100) : 0,
        quran_pages: (quranByDate[day] && quranByDate[day].pages_read.length) || 0,
        quran_minutes: (quranByDate[day] && quranByDate[day].duration_minutes) || 0,
        adhkar_sessions: adhkarByDate[day] || 0,
        good_deeds: deedsByDate[day] || 0,
        fasted: fastingDates.has(day),
      };
    });

    return res.status(200).json({
      period,
      start_date: startDate,
      end_date: endDate,
      days_counted: days.length,
      exempt_days: exemptDays.size,
      prayer: {
        completed: prayerCompleted,
        expected: prayerExpected,
        percent: prayerExpected ? Math.round((prayerCompleted / prayerExpected) * 100) : 0,
      },
      totals,
      series,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * A reverse-chronological log of everything tracked, for the History tab.
 */
async function getHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 180);
    const endDate = req.query.end_date || getCurrentDate();
    const start = new Date(`${endDate}T00:00:00`);
    start.setDate(start.getDate() - (limit - 1));
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate()
    ).padStart(2, '0')}`;

    const [prayerRecords, quranRecords, deedRecords, fastingRecords, adhkarRecords, reflections, exemptDays] =
      await Promise.all([
        PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        QuranReading.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        GoodDeedLog.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        FastingDay.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        AdhkarTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
        Muhasabah.find({ user_id: userId, week_start: { $gte: startDate, $lte: endDate } }),
        getExemptDays(userId, startDate, endDate),
      ]);

    const index = {};
    const ensure = (d) => {
      if (!index[d]) {
        index[d] = {
          date: d,
          exempt: exemptDays.has(d),
          prayers_completed: 0,
          quran_pages: 0,
          quran_minutes: 0,
          good_deeds: 0,
          fasted: false,
          adhkar_sessions: 0,
          has_reflection: false,
        };
      }
      return index[d];
    };

    for (const r of prayerRecords) {
      const fp = r.fardh_prayers || {};
      ensure(r.date).prayers_completed = FARDH_PRAYERS.filter((p) => fp[p] === true).length;
    }
    for (const r of quranRecords) {
      const e = ensure(r.date);
      e.quran_pages = (r.pages_read || []).length;
      e.quran_minutes = r.duration_minutes || 0;
    }
    for (const r of deedRecords) ensure(r.date).good_deeds += r.count || 0;
    for (const r of fastingRecords) ensure(r.date).fasted = r.status === 'completed';
    for (const r of adhkarRecords) {
      ensure(r.date).adhkar_sessions = (r.morning ? 1 : 0) + (r.evening ? 1 : 0);
    }
    for (const r of reflections) ensure(r.week_start).has_reflection = true;

    const entries = Object.values(index).sort((a, b) => (a.date < b.date ? 1 : -1));
    return res.status(200).json({ start_date: startDate, end_date: endDate, entries });
  } catch (err) {
    next(err);
  }
}

module.exports = { SECTION_WEIGHTS, getDashboard, getProgress, getHistory };
