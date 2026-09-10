const { GroupChallenge, GroupGoal, GroupFeedEvent, GroupReminder, User } = require('../models');
const { requireMembership, emitFeedEvent } = require('./groupChallengeController');
const { computeMetrics, getExemptPrayers, isPrayerExempt, FARDH_PRAYERS } = require('../services/worshipMetrics');
const { PrayerTracking } = require('../models');
const {
  SHAREABLE,
  sharesCategory,
  privacySettings,
  updateSharing,
  setAppearInFeed,
  groupPrefs,
  updateGroupPrefs,
} = require('../services/groupPrivacy');
const { weekBounds } = require('./muhasabahController');
const { getCurrentDate, getDaysBetweenDates } = require('../utils/dateUtils');
const { REACTIONS } = require('../models/GroupFeedEvent');

/**
 * One member's contribution to the group aggregate, for the categories they
 * chose to share. Returns null for anything kept private, and the caller
 * simply skips nulls — a private member never drags an average down.
 */
async function memberContribution(user, groupId, startDate, endDate) {
  const wanted = [];
  if (sharesCategory(user, groupId, 'quran')) wanted.push('quran_pages');
  if (sharesCategory(user, groupId, 'dhikr')) wanted.push('dhikr_count');
  if (sharesCategory(user, groupId, 'adhkar')) wanted.push('adhkar_sessions');
  if (sharesCategory(user, groupId, 'fasting')) wanted.push('fasting_days');
  if (sharesCategory(user, groupId, 'good_deeds')) wanted.push('good_deeds');

  const sharesPrayers = sharesCategory(user, groupId, 'prayers');
  const [metrics, prayerPercent] = await Promise.all([
    wanted.length ? computeMetrics(user._id, wanted, startDate, endDate) : Promise.resolve({}),
    sharesPrayers ? memberPrayerPercent(user._id, startDate, endDate) : Promise.resolve(null),
  ]);

  return { metrics, prayerPercent };
}

async function memberPrayerPercent(userId, startDate, endDate) {
  const [records, exemptByDay] = await Promise.all([
    PrayerTracking.find({ user_id: userId, date: { $gte: startDate, $lte: endDate } }),
    getExemptPrayers(userId, startDate, endDate),
  ]);
  const byDate = {};
  for (const r of records) byDate[r.date] = r;

  let done = 0;
  let expected = 0;
  for (const day of getDaysBetweenDates(startDate, endDate)) {
    const fp = (byDate[day] && byDate[day].fardh_prayers) || {};
    for (const p of FARDH_PRAYERS) {
      const completed = fp[p] === true;
      if (isPrayerExempt(exemptByDay, day, p) && !completed) continue;
      expected++;
      if (completed) done++;
    }
  }
  return expected ? Math.round((done / expected) * 100) : null;
}

/**
 * Group dashboard: headline counts plus aggregate percentages per category.
 *
 * Every number here is a group-level aggregate built only from members who
 * opted that category in. No per-member figures are returned, and there is no
 * ordering that could be read as a ranking.
 */
async function getGroupDashboard(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const anchor = req.query.date || getCurrentDate();
    const { week_start, week_end } = weekBounds(anchor);
    const today = getCurrentDate();
    const endDate = week_end > today ? today : week_end;
    const startDate = week_start > endDate ? endDate : week_start;

    const members = await User.find({ _id: { $in: group.users } }).select('name settings');

    const contributions = await Promise.all(
      members.map((m) => memberContribution(m, group._id, startDate, endDate))
    );

    // Aggregate: sums for count metrics, mean for prayer consistency.
    const totals = { quran_pages: 0, dhikr_count: 0, adhkar_sessions: 0, fasting_days: 0, good_deeds: 0 };
    const sharerCounts = { quran: 0, dhikr: 0, adhkar: 0, fasting: 0, good_deeds: 0, prayers: 0 };
    let prayerSum = 0;

    for (const c of contributions) {
      if (c.metrics.quran_pages !== undefined) { totals.quran_pages += c.metrics.quran_pages; sharerCounts.quran++; }
      if (c.metrics.dhikr_count !== undefined) { totals.dhikr_count += c.metrics.dhikr_count; sharerCounts.dhikr++; }
      if (c.metrics.adhkar_sessions !== undefined) { totals.adhkar_sessions += c.metrics.adhkar_sessions; sharerCounts.adhkar++; }
      if (c.metrics.fasting_days !== undefined) { totals.fasting_days += c.metrics.fasting_days; sharerCounts.fasting++; }
      if (c.metrics.good_deeds !== undefined) { totals.good_deeds += c.metrics.good_deeds; sharerCounts.good_deeds++; }
      if (c.prayerPercent !== null) { prayerSum += c.prayerPercent; sharerCounts.prayers++; }
    }

    const [challenges, goals, recentEvents] = await Promise.all([
      GroupChallenge.find({ group_id: group._id, archived: false }).sort({ start_date: -1 }).limit(5),
      GroupGoal.find({ group_id: group._id, archived: false }).sort({ start_date: -1 }).limit(5),
      GroupFeedEvent.find({ group_id: group._id }).sort({ created_at: -1 }).limit(5),
    ]);

    const eventUserIds = [...new Set(recentEvents.map((e) => e.user_id.toString()))];
    const eventUsers = await User.find({ _id: { $in: eventUserIds } }).select('name');
    const nameById = {};
    for (const u of eventUsers) nameById[u._id.toString()] = u.name;

    return res.status(200).json({
      group: {
        id: group._id,
        name: group.name,
        group_id: group.group_id,
        type: group.type || 'custom',
        member_count: group.users.length,
      },
      period: { start_date: startDate, end_date: endDate },
      // `sharing_members` tells the client how many people each figure is
      // based on, so the UI can say "from 4 of 9 members sharing".
      progress: {
        prayers: sharerCounts.prayers ? Math.round(prayerSum / sharerCounts.prayers) : null,
        quran_pages: sharerCounts.quran ? totals.quran_pages : null,
        dhikr_count: sharerCounts.dhikr ? totals.dhikr_count : null,
        adhkar_sessions: sharerCounts.adhkar ? totals.adhkar_sessions : null,
        fasting_days: sharerCounts.fasting ? totals.fasting_days : null,
        good_deeds: sharerCounts.good_deeds ? totals.good_deeds : null,
      },
      sharing_members: sharerCounts,
      active_challenges: challenges.length,
      active_goals: goals.length,
      recent_activity: recentEvents.map((e) => ({
        id: e._id,
        event_type: e.event_type,
        data: e.data,
        name: nameById[e.user_id.toString()] || null,
        created_at: e.created_at,
      })),
      my_privacy: privacySettings(req.user).share[group._id.toString()] || {},
      my_prefs: groupPrefs(req.user, group._id),
    });
  } catch (err) {
    next(err);
  }
}

// ── Activity feed + encouragement ────────────────────────────────────

async function getFeed(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const query = { group_id: group._id };
    if (req.query.before) query.created_at = { $lt: new Date(req.query.before) };

    const events = await GroupFeedEvent.find(query).sort({ created_at: -1 }).limit(limit);
    const userIds = [...new Set(events.map((e) => e.user_id.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const nameById = {};
    for (const u of users) nameById[u._id.toString()] = u.name;

    const uid = req.user._id.toString();
    return res.status(200).json({
      events: events.map((e) => {
        const counts = {};
        for (const r of e.reactions || []) counts[r.reaction] = (counts[r.reaction] || 0) + 1;
        const mine = (e.reactions || []).find((r) => r.user_id.toString() === uid);
        return {
          id: e._id,
          user_id: e.user_id,
          name: nameById[e.user_id.toString()] || null,
          event_type: e.event_type,
          data: e.data,
          reaction_counts: counts,
          my_reaction: mine ? mine.reaction : null,
          created_at: e.created_at,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add, change or remove one encouragement on a feed event.
 * Reactions are a fixed set of du'a-style phrases — no free text, so a feed
 * cannot turn into a comment thread or a place to criticise someone.
 */
async function reactToEvent(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const event = await GroupFeedEvent.findOne({ _id: req.params.id, group_id: group._id });
    if (!event) return res.status(404).json({ error: 'Activity not found' });

    const { reaction } = req.body;
    const uid = req.user._id.toString();
    const existing = (event.reactions || []).filter((r) => r.user_id.toString() !== uid);

    if (reaction) {
      if (!REACTIONS.includes(reaction)) {
        return res.status(400).json({ error: `reaction must be one of: ${REACTIONS.join(', ')}` });
      }
      existing.push({ user_id: req.user._id, reaction, created_at: new Date() });
    }

    event.reactions = existing;
    await event.save();

    const counts = {};
    for (const r of event.reactions) counts[r.reaction] = (counts[r.reaction] || 0) + 1;

    return res.status(200).json({ success: true, reaction_counts: counts, my_reaction: reaction || null });
  } catch (err) {
    next(err);
  }
}

/**
 * Announce a milestone to the group. The client calls this when a shared goal
 * or streak lands; the server still checks the user's feed opt-in.
 */
async function postMilestone(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const { event_type, data } = req.body;
    const allowed = ['goal_completed', 'streak_milestone', 'muhasabah_completed'];
    if (!allowed.includes(event_type)) {
      return res.status(400).json({ error: `event_type must be one of: ${allowed.join(', ')}` });
    }

    if (!privacySettings(req.user).appear_in_feed) {
      return res.status(200).json({ success: true, posted: false, reason: 'You are hidden from group feeds' });
    }

    // Milestone bodies are deliberately shallow — a title and a number only.
    const safeData = {};
    if (data && typeof data === 'object') {
      if (data.title !== undefined) safeData.title = String(data.title).slice(0, 120);
      if (data.count !== undefined) safeData.count = Number(data.count) || 0;
    }

    const event = await GroupFeedEvent.create({
      group_id: group._id,
      user_id: req.user._id,
      event_type,
      data: safeData,
    });

    return res.status(200).json({ success: true, posted: true, id: event._id });
  } catch (err) {
    next(err);
  }
}

// ── Reminders ────────────────────────────────────────────────────────

async function listReminders(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const reminders = await GroupReminder.find({ group_id: group._id, active: true }).sort({ created_at: -1 });
    return res.status(200).json({
      reminders: reminders.map((r) => ({
        id: r._id,
        title: r.title,
        message: r.message,
        frequency: r.frequency,
        time_of_day: r.time_of_day,
        day_of_week: r.day_of_week,
        send_at: r.send_at,
        created_by: r.created_by,
      })),
      my_prefs: groupPrefs(req.user, group._id),
    });
  } catch (err) {
    next(err);
  }
}

async function createReminder(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const { title, message, frequency, time_of_day, day_of_week, send_at } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    if (frequency && !['once', 'daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ error: 'frequency must be once, daily or weekly' });
    }

    const reminder = await GroupReminder.create({
      group_id: group._id,
      created_by: req.user._id,
      title: String(title).trim(),
      message: message || '',
      frequency: frequency || 'once',
      time_of_day: time_of_day || null,
      day_of_week: day_of_week === undefined ? null : Number(day_of_week),
      send_at: send_at ? new Date(send_at) : new Date(),
    });

    return res.status(200).json({ success: true, id: reminder._id });
  } catch (err) {
    next(err);
  }
}

async function deleteReminder(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const result = await GroupReminder.deleteOne({ _id: req.params.id, group_id: group._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Reminder not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ── Per-member privacy + notification preferences ────────────────────

async function getMySettings(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const privacy = privacySettings(req.user);
    return res.status(200).json({
      shareable: SHAREABLE,
      share: privacy.share[group._id.toString()] || {},
      appear_in_feed: privacy.appear_in_feed,
      prefs: groupPrefs(req.user, group._id),
    });
  } catch (err) {
    next(err);
  }
}

async function updateMySettings(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const { share, appear_in_feed, muted, reminders, frequency } = req.body;

    let updatedShare = privacySettings(req.user).share[group._id.toString()] || {};
    if (share && typeof share === 'object') {
      updatedShare = await updateSharing(req.user, group._id, share);
    }
    if (appear_in_feed !== undefined) {
      await setAppearInFeed(req.user, appear_in_feed);
    }

    let prefs = groupPrefs(req.user, group._id);
    if (muted !== undefined || reminders !== undefined || frequency !== undefined) {
      prefs = await updateGroupPrefs(req.user, group._id, { muted, reminders, frequency });
    }

    return res.status(200).json({
      success: true,
      share: updatedShare,
      appear_in_feed: privacySettings(req.user).appear_in_feed,
      prefs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGroupDashboard,
  getFeed,
  reactToEvent,
  postMilestone,
  listReminders,
  createReminder,
  deleteReminder,
  getMySettings,
  updateMySettings,
  emitFeedEvent,
};
