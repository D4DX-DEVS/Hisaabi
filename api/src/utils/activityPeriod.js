/**
 * Which day / week / month a group activity's status belongs to.
 *
 * A group activity repeats: "daily" starts fresh every day, "weekly" every
 * week (Monday start, matching the group dashboard), "monthly" every month.
 * "recurring" is treated as daily. Each member's status is stored with the
 * period it was set in, so a new period simply shows as not done while the
 * earlier ones stay as history.
 *
 * The day is the member's own local day, so a Fajr marked at 5 AM counts for
 * that morning rather than the previous UTC day. The app may send its local
 * date; otherwise the timezone saved on the account is used.
 */

const DEFAULT_ZONE = 'Asia/Kolkata';

function dayInZone(zone, now = new Date()) {
  const fmt = (z) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  try {
    return fmt(zone || DEFAULT_ZONE);
  } catch (e) {
    return fmt(DEFAULT_ZONE);
  }
}

function weekStart(day) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** 'd:2026-11-10', 'w:2026-11-09' or 'm:2026-11' for an activity type and a YYYY-MM-DD day. */
function periodKey(activityType, day) {
  if (activityType === 'weekly') return `w:${weekStart(day)}`;
  if (activityType === 'monthly') return `m:${day.slice(0, 7)}`;
  return `d:${day}`;
}

/**
 * Today for this request: the day the app sent when it is a real date within a
 * day of now (guards against a wrong clock), else today in the account's zone.
 */
function resolveDay(sentDate, zone, now = new Date()) {
  if (typeof sentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sentDate)) {
    const sent = new Date(`${sentDate}T00:00:00Z`).getTime();
    if (!Number.isNaN(sent) && Math.abs(sent - now.getTime()) < 2 * 24 * 60 * 60 * 1000) return sentDate;
  }
  return dayInZone(zone, now);
}

/** The period one stored entry belongs to. Entries from before periods existed fall back to when they were set. */
function entryPeriod(entry, activityType, zone) {
  if (!entry) return null;
  if (entry.period) return entry.period;
  if (!entry.updatedAt) return null;
  const at = new Date(entry.updatedAt);
  if (Number.isNaN(at.getTime())) return null;
  return periodKey(activityType, dayInZone(zone, at));
}

/** Only the entries that count right now. */
function statusesForPeriod(entries, activityType, day, zone) {
  const current = periodKey(activityType, day);
  return (entries || []).filter((e) => entryPeriod(e, activityType, zone) === current);
}

/** The same day (or week / month) `back` periods earlier, as a YYYY-MM-DD anchor. */
function shiftDay(activityType, day, back) {
  const d = new Date(`${day}T00:00:00Z`);
  if (activityType === 'weekly') d.setUTCDate(d.getUTCDate() - 7 * back);
  else if (activityType === 'monthly') {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - back);
  } else d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether one member finished each of the last few periods, oldest first and
 * ending with the current one: 7 days for daily, 4 weeks or 4 months otherwise.
 */
function recentHistory(entries, userId, activityType, day, zone) {
  const count = activityType === 'weekly' || activityType === 'monthly' ? 4 : 7;
  const out = [];
  for (let back = count - 1; back >= 0; back--) {
    const anchor = shiftDay(activityType, day, back);
    out.push({
      period: periodKey(activityType, anchor),
      done: statusesForPeriod(entries, activityType, anchor, zone).some(
        (e) => e.user && String(e.user) === String(userId) && e.status === 'completed'
      ),
    });
  }
  return out;
}

module.exports = { dayInZone, periodKey, resolveDay, entryPeriod, statusesForPeriod, recentHistory };
