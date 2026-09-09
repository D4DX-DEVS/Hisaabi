const { Muhasabah } = require('../models');
const { computeMetrics, getExemptDays, FARDH_PRAYERS } = require('../services/worshipMetrics');
const { PrayerTracking } = require('../models');
const { getCurrentDate, getDaysBetweenDates } = require('../utils/dateUtils');

/**
 * Monday-start week containing `dateStr`, as { week_start, week_end }.
 */
function weekBounds(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay(); // 0 = Sunday
  const offsetToMonday = dow === 0 ? 6 : dow - 1;
  const start = new Date(d);
  start.setDate(d.getDate() - offsetToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { week_start: fmt(start), week_end: fmt(end) };
}

/**
 * Consistency numbers for a week — the factual half of a Muhasabah review.
 *
 * Prayer figures are computed against *eligible* days only, so a Personal
 * Cycle week never reads as a week of failure.
 */
async function buildWeeklySummary(userId, weekStart, weekEnd) {
  const today = getCurrentDate();
  // Never grade days that haven't happened yet.
  const effectiveEnd = weekEnd > today ? today : weekEnd;
  if (effectiveEnd < weekStart) {
    return { days_elapsed: 0, prayer: { completed: 0, expected: 0, percent: 0, exempt_days: 0 } };
  }

  const days = getDaysBetweenDates(weekStart, effectiveEnd);
  const [metrics, exemptDays, prayerRecords] = await Promise.all([
    computeMetrics(
      userId,
      [
        'prayers_ontime',
        'prayers_jamaah',
        'prayers_qada',
        'quran_pages',
        'quran_minutes',
        'dhikr_count',
        'sunnah_prayers',
        'fasting_days',
        'adhkar_sessions',
        'dua_completions',
        'good_deeds',
        'learning_minutes',
      ],
      weekStart,
      effectiveEnd
    ),
    getExemptDays(userId, weekStart, effectiveEnd),
    PrayerTracking.find({ user_id: userId, date: { $gte: weekStart, $lte: effectiveEnd } }),
  ]);

  const byDate = {};
  for (const r of prayerRecords) byDate[r.date] = r;

  let completed = 0;
  let expected = 0;
  for (const day of days) {
    const isExempt = exemptDays.has(day);
    const fp = (byDate[day] && byDate[day].fardh_prayers) || {};
    for (const p of FARDH_PRAYERS) {
      const done = fp[p] === true;
      if (isExempt && !done) continue;
      expected++;
      if (done) completed++;
    }
  }

  return {
    days_elapsed: days.length,
    prayer: {
      completed,
      expected,
      percent: expected ? Math.round((completed / expected) * 100) : 0,
      exempt_days: exemptDays.size,
    },
    ...metrics,
  };
}

async function getCurrentMuhasabah(req, res, next) {
  try {
    const userId = req.user._id;
    const { date } = req.query;
    const { week_start, week_end } = weekBounds(date || getCurrentDate());

    const [record, summary] = await Promise.all([
      Muhasabah.findOne({ user_id: userId, week_start }),
      buildWeeklySummary(userId, week_start, week_end),
    ]);

    return res.status(200).json({
      week_start,
      week_end,
      // Live summary — a saved reflection keeps its own snapshot separately.
      summary,
      reflection: record
        ? {
            id: record._id,
            did_well: record.did_well,
            can_improve: record.can_improve,
            needs_attention: record.needs_attention,
            next_week_goal: record.next_week_goal,
            summary: record.summary,
            updated_at: record.updated_at,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

async function saveMuhasabah(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, did_well, can_improve, needs_attention, next_week_goal } = req.body;
    const { week_start, week_end } = weekBounds(date || getCurrentDate());

    const summary = await buildWeeklySummary(userId, week_start, week_end);

    const record = await Muhasabah.findOneAndUpdate(
      { user_id: userId, week_start },
      {
        $set: {
          week_end,
          did_well: did_well || '',
          can_improve: can_improve || '',
          needs_attention: needs_attention || '',
          next_week_goal: next_week_goal || '',
          summary,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      reflection: {
        id: record._id,
        week_start: record.week_start,
        week_end: record.week_end,
        did_well: record.did_well,
        can_improve: record.can_improve,
        needs_attention: record.needs_attention,
        next_week_goal: record.next_week_goal,
        summary: record.summary,
        updated_at: record.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMuhasabahHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 52);
    const records = await Muhasabah.find({ user_id: userId })
      .sort({ week_start: -1 })
      .limit(limit);

    return res.status(200).json({
      reflections: records.map((r) => ({
        id: r._id,
        week_start: r.week_start,
        week_end: r.week_end,
        did_well: r.did_well,
        can_improve: r.can_improve,
        needs_attention: r.needs_attention,
        next_week_goal: r.next_week_goal,
        summary: r.summary,
        updated_at: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteMuhasabah(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await Muhasabah.deleteOne({ _id: req.params.id, user_id: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Reflection not found' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  weekBounds,
  buildWeeklySummary,
  getCurrentMuhasabah,
  saveMuhasabah,
  getMuhasabahHistory,
  deleteMuhasabah,
};
