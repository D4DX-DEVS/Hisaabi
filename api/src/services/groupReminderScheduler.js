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
 * daily/weekly one fires once per local day. Before sending, a reminder is
 * claimed atomically (findOneAndUpdate on last_sent_at) so two server
 * instances never both send it.
 *
 * time_of_day / day_of_week are read in the reminder's own `timezone`
 * (IANA, default Asia/Kolkata). A recurring reminder is due for
 * CATCH_UP_MINUTES after its time, so a restart or a slow tick doesn't skip it.
 */
const { GroupReminder, Group } = require('../models');
const { notifyGroupMember } = require('../controllers/groupChallengeController');
const { DEFAULT_TZ, isValidTimeZone, localParts, startOfLocalDayUTC } = require('../utils/tzUtils');

const CHECK_INTERVAL_MS = 60 * 1000;
const ONCE_LOOKBACK_MS = 24 * 60 * 60 * 1000; // ignore anything more than a day overdue
const CATCH_UP_MINUTES = 10;

function reminderTz(reminder) {
  return isValidTimeZone(reminder.timezone) ? reminder.timezone : DEFAULT_TZ;
}

function isDue(reminder, now) {
  if (reminder.frequency === 'once') {
    if (reminder.last_sent_at) return false;
    return reminder.send_at <= now && now - reminder.send_at <= ONCE_LOOKBACK_MS;
  }

  const m = /^(\d{2}):(\d{2})$/.exec(reminder.time_of_day || '');
  if (!m) return false;
  const tz = reminderTz(reminder);
  const local = localParts(now, tz);
  const sinceTarget = local.hour * 60 + local.minute - (Number(m[1]) * 60 + Number(m[2]));
  if (sinceTarget < 0 || sinceTarget >= CATCH_UP_MINUTES) return false;
  if (reminder.last_sent_at && reminder.last_sent_at >= startOfLocalDayUTC(now, tz)) return false;

  if (reminder.frequency === 'weekly') {
    return reminder.day_of_week === local.isoWeekday;
  }
  return reminder.frequency === 'daily';
}

async function fireReminder(reminder) {
  const group = await Group.findById(reminder.group_id);
  if (!group) return;

  // Claim first: only the instance that wins this update sends.
  const claimed = await GroupReminder.findOneAndUpdate(
    {
      _id: reminder._id,
      $or: [
        { last_sent_at: null },
        { last_sent_at: { $lt: startOfLocalDayUTC(new Date(), reminderTz(reminder)) } },
      ],
    },
    { $set: { last_sent_at: new Date() } }
  );
  if (!claimed) return;

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
