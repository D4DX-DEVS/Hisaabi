/**
 * Per-habit view of a week or month: for each thing the user tracks, how many
 * of the days in the period they did it, and the day-by-day counts.
 *
 * A day counts as "done" when the habit was logged that day, or, when the habit
 * has a daily target, when the target was met.
 *
 * Sources: sunnah prayers (Duha, Tahajjud...), good deeds and the user's own
 * habits, dhikr counts, and Qur'an recitations (pages recited, per surah).
 * Habits the user created always appear, even with nothing logged yet.
 */

function titleCase(text) {
  const t = String(text || '').replace(/^custom:/, '').replace(/[_-]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function toCount(v) {
  if (v === true) return 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {string[]} days          the days of the period that have happened, YYYY-MM-DD
 * @param {object}   data
 * @param {object[]} data.prayerRecords   PrayerTracking rows (sunnah_prayers map)
 * @param {object[]} data.deedRecords     GoodDeedLog rows
 * @param {object[]} data.dhikrRecords    DhikrTracking rows (dhikr_counts map)
 * @param {object[]} data.quranRecords    QuranReading rows (pages_recited, surah_recitations)
 * @param {object[]} data.customDeeds     the user's own habits: {key,label,kind,target}
 */
function buildHabits(days, data) {
  const { prayerRecords = [], deedRecords = [], dhikrRecords = [], quranRecords = [], customDeeds = [] } = data;
  const inPeriod = new Set(days);
  const habits = new Map();

  const habit = (key, label, group, extra = {}) => {
    if (!habits.has(key)) {
      habits.set(key, { key, label, group, kind: 'count', target: null, perDay: {}, ...extra });
    }
    return habits.get(key);
  };
  const add = (h, date, n) => {
    if (!inPeriod.has(date) || n <= 0) return;
    h.perDay[date] = (h.perDay[date] || 0) + n;
  };

  // The user's own habits show up even before anything is logged.
  for (const c of customDeeds) {
    habit(c.key, c.label || titleCase(c.key), 'Habits', {
      kind: c.kind === 'tick' ? 'tick' : 'count',
      target: Number(c.target) > 0 ? Number(c.target) : null,
    });
  }

  for (const r of prayerRecords) {
    for (const [name, v] of Object.entries(r.sunnah_prayers || {})) {
      const n = toCount(v);
      if (n > 0) add(habit(`sunnah:${name}`, titleCase(name), 'Sunnah prayers'), r.date, n);
    }
  }

  for (const r of deedRecords) {
    const isCustom = String(r.deed_key).startsWith('custom:');
    const group = r.category === 'learning' ? 'Learning' : isCustom ? 'Habits' : 'Good deeds';
    const h = habit(r.deed_key, r.label || titleCase(r.deed_key), group);
    // Learning is tracked in minutes; show it as days studied.
    add(h, r.date, r.category === 'learning' ? Math.max(1, r.count || 1) : r.count || 0);
  }

  for (const r of dhikrRecords) {
    for (const [name, v] of Object.entries(r.dhikr_counts || {})) {
      const n = toCount(v);
      if (n > 0) add(habit(`dhikr:${name}`, titleCase(name), 'Dhikr'), r.date, n);
    }
  }

  for (const r of quranRecords) {
    const pages = toCount(r.pages_recited);
    if (pages > 0) add(habit('quran:pages_recited', 'Pages recited', "Qur'an"), r.date, pages);
    for (const [surah, v] of Object.entries(r.surah_recitations || {})) {
      const n = toCount(v);
      if (n > 0) add(habit(`quran:surah:${surah}`, `Surah ${surah}`, "Qur'an"), r.date, n);
    }
  }

  const out = [];
  for (const h of habits.values()) {
    const series = days.map((date) => {
      const count = h.perDay[date] || 0;
      const done = h.kind === 'tick' ? count > 0 : h.target ? count >= h.target : count > 0;
      return { date, count, done };
    });
    out.push({
      key: h.key,
      label: h.label,
      group: h.group,
      kind: h.kind,
      target: h.target,
      days_done: series.filter((d) => d.done).length,
      total: days.length,
      days: series,
    });
  }

  // Own habits first, then whatever was done most often.
  out.sort((a, b) => {
    const ar = a.group === 'Habits' ? 0 : 1;
    const br = b.group === 'Habits' ? 0 : 1;
    return ar - br || b.days_done - a.days_done || a.label.localeCompare(b.label);
  });
  return out;
}

module.exports = { buildHabits, titleCase };
