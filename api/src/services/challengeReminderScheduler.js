/**
 * Fires "challenge ending soon" pushes — FR §22 lists this as a supported
 * reminder type, but nothing ever polled for it; only manual admin
 * broadcasts (groupReminderScheduler.js) exist today.
 *
 * Runs every 6 hours: challenge windows are date-only (`end_date` is a plain
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
const { GroupChallenge, Group } = require('../models');
const { notifyGroupMember } = require('../controllers/groupChallengeController');
const { getCurrentDate, formatDate } = require('../utils/dateUtils');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const NOTICE_WINDOW_DAYS = 2;

async function notifyChallenge(challenge) {
  const group = await Group.findById(challenge.group_id);
  if (!group) return;

  const joinedIds = new Set((challenge.participants || []).map((p) => p.user_id.toString()));
  const alreadyNotified = new Set((challenge.ending_soon_notified || []).map((id) => id.toString()));
  let changed = false;

  for (const memberId of group.users) {
    const uid = memberId.toString();
    if (alreadyNotified.has(uid)) continue;

    const joined = joinedIds.has(uid);
    const message = {
      title: challenge.name,
      body: joined
        ? `Ends ${challenge.end_date} — keep going!`
        : `Ends ${challenge.end_date} — there's still time to join.`,
      data: {
        type: joined ? 'challenge_ending_soon' : 'challenge_not_joined',
        group_id: group.group_id,
        challenge_id: challenge._id.toString(),
      },
    };

    // Fire-and-forget per member — notifyGroupMember already never throws.
    notifyGroupMember(memberId, group._id, message);
    challenge.ending_soon_notified.push(memberId);
    changed = true;
  }

  if (changed) await challenge.save();
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
