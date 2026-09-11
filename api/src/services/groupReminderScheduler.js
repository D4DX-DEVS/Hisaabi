/**
 * Fires group reminders as push notifications when they come due.
 *
 * The reminder itself (title, message, frequency, time_of_day, day_of_week,
 * send_at) has existed since the group-space redesign; nothing ever polled
 * it to actually push anything. This is that poll.
 *
 * Runs on a plain setInterval — the backend has no existing job queue, and
 * a minute-granularity check against a low-volume collection doesn't need
 * one. `last_sent_at` dedupes: a 'once' reminder fires exactly once, a
 * daily/weekly one fires once per occurrence rather than once per minute
 * this happens to match.
 *
 * Times are interpreted in the server's own local timezone, the same
 * convention getCurrentDate() already uses everywhere else in this
 * codebase — there's no per-reminder timezone field to do otherwise.
 */
const { GroupReminder, Group } = require('../models');
const { notifyGroupMember } = require('../controllers/groupChallengeController');

const CHECK_INTERVAL_MS = 60 * 1000;
const ONCE_LOOKBACK_MS = 24 * 60 * 60 * 1000; // ignore anything more than a day overdue

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ISO-8601 weekday: 1 = Monday ... 7 = Sunday, matching the schema's 1-7 range.
function isoWeekday(date) {
  const day = date.getDay(); // 0 = Sunday ... 6 = Saturday
  return day === 0 ? 7 : day;
}

function isDue(reminder, now) {
  if (reminder.frequency === 'once') {
    if (reminder.last_sent_at) return false;
    return reminder.send_at <= now && now - reminder.send_at <= ONCE_LOOKBACK_MS;
  }

  if (!reminder.time_of_day || hhmm(now) !== reminder.time_of_day) return false;
  if (reminder.last_sent_at && isSameLocalDay(reminder.last_sent_at, now)) return false;

  if (reminder.frequency === 'weekly') {
    return reminder.day_of_week === isoWeekday(now);
  }
  return reminder.frequency === 'daily';
}

async function fireReminder(reminder) {
  const group = await Group.findById(reminder.group_id);
  if (!group) return;

  const message = {
    title: group.name,
    body: reminder.message ? `${reminder.title} — ${reminder.message}` : reminder.title,
    data: { type: 'group_reminder', group_id: group.group_id, reminder_id: reminder._id.toString() },
  };

  // Fire-and-forget per member — one slow/failed send must not delay or
  // block the others, and notifyGroupMember already never throws.
  for (const memberId of group.users) {
    notifyGroupMember(memberId, group._id, message);
  }

  reminder.last_sent_at = new Date();
  await reminder.save();
}

async function tick() {
  try {
    const now = new Date();
    const reminders = await GroupReminder.find({ active: true });
    for (const reminder of reminders) {
      if (isDue(reminder, now)) {
        await fireReminder(reminder);
      }
    }
  } catch (err) {
    console.warn('[groupReminderScheduler] tick failed:', err.message);
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return; // already running
  intervalHandle = setInterval(tick, CHECK_INTERVAL_MS);
  tick(); // don't wait a full minute for the first check
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, tick, isDue };
