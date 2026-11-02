/**
 * Fires "challenge ending soon" pushes — FR §22 lists this as a supported
 * reminder type, but nothing ever polled for it; only manual admin
 * broadcasts (groupReminderScheduler.js) exist today.
 *
 * Runs every 6 hours (pushes only 08:00-21:00 in each member's timezone): challenge windows are date-only (`end_date` is a plain
 * YYYY-MM-DD string), so groupReminderScheduler's minute-granularity check
 * isn't needed here. `ending_soon_notified` dedupes per user, per challenge,
 * once ever — a member already pushed for a challenge (joined or not) is
 * never pushed again for it, even across multiple ticks inside the notice
 * window.
 *
 * Privacy: serializeChallenge already never exposes one member's progress
 * to another, even admins (see its own comment) — every push here is a
 * notifyGroupMember call scoped to exactly one user, reporting only their
 * own status, never another member's.
 */
const { GroupChallenge, Group, User } = require('../models');
const { notifyGroupMember, participantProgress } = require('../controllers/groupChallengeController');
const { getCurrentDate, formatDate } = require('../utils/dateUtils');
const { DEFAULT_TZ, isValidTimeZone, localParts } = require('../utils/tzUtils');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const NOTICE_WINDOW_DAYS = 2;
// Pushes only go out 08:00-20:59 in the member's own timezone.
const SEND_FROM_HOUR = 8;
const SEND_UNTIL_HOUR = 21;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' -> 'D MMM' (e.g. 5 Nov).
function formatDayMonth(iso) {
  const [, m, d] = String(iso).split('-');
  return MONTHS[Number(m) - 1] ? `${Number(d)} ${MONTHS[Number(m) - 1]}` : String(iso);
}

function memberTz(user) {
  const tz = user && user.settings && user.settings.other_settings && user.settings.other_settings.timezone;
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

async function notifyChallenge(challenge) {
  const group = await Group.findById(challenge.group_id);
  if (!group) return;

  const joinedById = new Map((challenge.participants || []).map((p) => [p.user_id.toString(), p]));
  const alreadyNotified = new Set((challenge.ending_soon_notified || []).map((id) => id.toString()));
  const pendingIds = group.users.filter((id) => !alreadyNotified.has(id.toString()));
  if (!pendingIds.length) return;

  const users = await User.find({ _id: { $in: pendingIds } }).select('settings');
  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  const now = new Date();

  for (const memberId of pendingIds) {
    const uid = memberId.toString();

    // Outside the member's daytime window: skip without marking, so the
    // next tick retries.
    const { hour } = localParts(now, memberTz(userById.get(uid)));
    if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) continue;

    const participant = joinedById.get(uid);
    const joined = !!participant;
    if (joined) {
      // Nothing to nudge about once they have finished.
      const progress = await participantProgress(challenge, participant);
      if (participant.completed || progress >= challenge.target) continue;
    }

    const endsOn = formatDayMonth(challenge.end_date);
    await notifyGroupMember(memberId, group._id, {
      title: challenge.name,
      body: joined
        ? `Ends ${endsOn} — keep going!`
        : `Ends ${endsOn} — there's still time to join.`,
      data: {
        type: joined ? 'challenge_ending_soon' : 'challenge_not_joined',
        group_id: group.group_id,
        challenge_id: challenge._id.toString(),
      },
    });
    // Targeted atomic write: cannot clobber concurrent progress updates the
    // way a whole-document save() could.
    await GroupChallenge.updateOne({ _id: challenge._id }, { $addToSet: { ending_soon_notified: memberId } });
  }
}

async function tick() {
  try {
    const today = getCurrentDate();
    const cutoff = formatDate(new Date(Date.now() + NOTICE_WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const challenges = await GroupChallenge.find({
      archived: false,
      end_date: { $gte: today, $lte: cutoff },
    });
    for (const challenge of challenges) {
      await notifyChallenge(challenge);
    }
  } catch (err) {
    console.warn('[challengeReminderScheduler] tick failed:', err.message);
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return; // already running
  intervalHandle = setInterval(tick, CHECK_INTERVAL_MS);
  tick(); // don't wait a full 6 hours for the first check
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, tick };
