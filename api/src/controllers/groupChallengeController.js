const { Group, GroupChallenge, GroupGoal, GroupFeedEvent, User } = require('../models');
const { computeMetric } = require('../services/worshipMetrics');
const { appearsInFeed } = require('../services/groupPrivacy');
const { METRICS } = require('../models/WorshipGoal');

function isGroupAdmin(group, userId) {
  const uid = userId.toString();
  return (
    group.admin_id.toString() === uid ||
    (group.co_admins || []).some((id) => id.toString() === uid)
  );
}

/**
 * Resolve a group by its 6-char code and assert the caller is a member.
 * Returns null after responding when the check fails.
 */
async function requireMembership(req, res, { adminOnly = false } = {}) {
  const group = await Group.findOne({ group_id: req.params.group_id });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return null;
  }
  const uid = req.user._id.toString();
  const isMember = group.users.some((u) => u.toString() === uid);
  if (!isMember) {
    res.status(403).json({ error: 'You are not a member of this group' });
    return null;
  }
  if (adminOnly && !isGroupAdmin(group, uid)) {
    res.status(403).json({ error: 'Only group admins can do this' });
    return null;
  }
  return group;
}

/**
 * Record a positive feed event, if the actor has not opted out of the feed.
 * Feed writes are best-effort: they must never fail the action that caused them.
 */
async function emitFeedEvent(groupId, user, eventType, data) {
  try {
    if (!appearsInFeed(user)) return;
    await GroupFeedEvent.create({
      group_id: groupId,
      user_id: user._id,
      event_type: eventType,
      data: data || {},
    });
  } catch (err) {
    // Intentionally swallowed — see above.
  }
}

// ── Challenges ───────────────────────────────────────────────────────

async function participantProgress(challenge, participant) {
  if (challenge.metric === 'manual') return participant.progress || 0;
  return computeMetric(participant.user_id, challenge.metric, challenge.start_date, challenge.end_date);
}

/**
 * Serialize a challenge for the client.
 *
 * Member names are included only so participants can be listed; progress is
 * a single number per person and there is deliberately no ordering, ranking
 * or "top performer" field — the FR forbids competitive framing.
 */
async function serializeChallenge(challenge, userMap, currentUserId) {
  const participants = await Promise.all(
    (challenge.participants || []).map(async (p) => {
      const progress = await participantProgress(challenge, p);
      const u = userMap[p.user_id.toString()];
      return {
        user_id: p.user_id,
        name: u ? u.name : null,
        progress,
        percent: challenge.target ? Math.min(100, Math.round((progress / challenge.target) * 100)) : 0,
        completed: progress >= challenge.target,
        joined_at: p.joined_at,
      };
    })
  );

  const completedCount = participants.filter((p) => p.completed).length;
  const me = participants.find((p) => p.user_id.toString() === currentUserId.toString());

  return {
    id: challenge._id,
    name: challenge.name,
    description: challenge.description,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    metric: challenge.metric,
    target: challenge.target,
    icon: challenge.icon,
    archived: challenge.archived,
    created_by: challenge.created_by,
    participant_count: participants.length,
    completed_count: completedCount,
    // Group-level completion share — the collective picture, not a ranking.
    group_percent: participants.length
      ? Math.round(
          participants.reduce((s, p) => s + p.percent, 0) / participants.length
        )
      : 0,
    joined: !!me,
    my_progress: me ? me.progress : 0,
    my_percent: me ? me.percent : 0,
    participants,
  };
}

async function listChallenges(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const query = { group_id: group._id };
    if (req.query.include_archived !== 'true') query.archived = false;

    const challenges = await GroupChallenge.find(query).sort({ start_date: -1 });
    const userIds = [...new Set(challenges.flatMap((c) => (c.participants || []).map((p) => p.user_id.toString())))];
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u;

    const payload = await Promise.all(challenges.map((c) => serializeChallenge(c, userMap, req.user._id)));
    return res.status(200).json({ challenges: payload });
  } catch (err) {
    next(err);
  }
}

async function createChallenge(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const { name, description, start_date, end_date, metric, target, icon } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });
    if (start_date > end_date) return res.status(400).json({ error: 'start_date cannot be after end_date' });

    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget) || numericTarget < 1) {
      return res.status(400).json({ error: 'target must be a positive number' });
    }
    if (metric && metric !== 'manual' && !METRICS.includes(metric)) {
      return res.status(400).json({ error: `metric must be one of: ${METRICS.join(', ')}` });
    }

    const challenge = await GroupChallenge.create({
      group_id: group._id,
      created_by: req.user._id,
      name: String(name).trim(),
      description: description || '',
      start_date,
      end_date,
      metric: metric || 'manual',
      target: numericTarget,
      icon: icon || null,
    });

    return res.status(200).json({
      success: true,
      challenge: await serializeChallenge(challenge, {}, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function updateChallenge(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const challenge = await GroupChallenge.findOne({ _id: req.params.id, group_id: group._id });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const { name, description, start_date, end_date, target, icon, archived } = req.body;
    if (name !== undefined) challenge.name = String(name).trim();
    if (description !== undefined) challenge.description = description;
    if (start_date !== undefined) challenge.start_date = start_date;
    if (end_date !== undefined) challenge.end_date = end_date;
    if (challenge.start_date > challenge.end_date) {
      return res.status(400).json({ error: 'start_date cannot be after end_date' });
    }
    if (target !== undefined) {
      const numericTarget = Number(target);
      if (!Number.isFinite(numericTarget) || numericTarget < 1) {
        return res.status(400).json({ error: 'target must be a positive number' });
      }
      challenge.target = numericTarget;
    }
    if (icon !== undefined) challenge.icon = icon;
    if (archived !== undefined) challenge.archived = archived === true || archived === 'true';

    await challenge.save();
    return res.status(200).json({
      success: true,
      challenge: await serializeChallenge(challenge, {}, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function joinChallenge(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const challenge = await GroupChallenge.findOne({ _id: req.params.id, group_id: group._id });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const uid = req.user._id.toString();
    const already = (challenge.participants || []).some((p) => p.user_id.toString() === uid);
    if (already) return res.status(400).json({ error: 'You have already joined this challenge' });

    challenge.participants.push({ user_id: req.user._id, progress: 0 });
    await challenge.save();

    await emitFeedEvent(group._id, req.user, 'challenge_joined', { title: challenge.name });

    return res.status(200).json({
      success: true,
      challenge: await serializeChallenge(challenge, {}, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function leaveChallenge(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const challenge = await GroupChallenge.findOne({ _id: req.params.id, group_id: group._id });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const uid = req.user._id.toString();
    challenge.participants = (challenge.participants || []).filter((p) => p.user_id.toString() !== uid);
    await challenge.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Report progress on a manual challenge. Derived challenges compute their own
 * progress from tracked data and reject this call.
 */
async function reportChallengeProgress(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const challenge = await GroupChallenge.findOne({ _id: req.params.id, group_id: group._id });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.metric !== 'manual') {
      return res.status(400).json({ error: 'This challenge tracks your activity automatically' });
    }

    const uid = req.user._id.toString();
    const participant = (challenge.participants || []).find((p) => p.user_id.toString() === uid);
    if (!participant) return res.status(400).json({ error: 'Join the challenge first' });

    const { progress, delta } = req.body;
    if (progress !== undefined) {
      const n = Number(progress);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'progress must be a non-negative number' });
      participant.progress = n;
    } else {
      const d = delta === undefined ? 1 : Number(delta);
      if (!Number.isFinite(d)) return res.status(400).json({ error: 'delta must be a number' });
      participant.progress = Math.max(0, (participant.progress || 0) + d);
    }

    const justCompleted = !participant.completed && participant.progress >= challenge.target;
    if (justCompleted) {
      participant.completed = true;
      participant.completed_at = new Date();
    }

    challenge.markModified('participants');
    await challenge.save();

    if (justCompleted) {
      await emitFeedEvent(group._id, req.user, 'challenge_completed', { title: challenge.name });
    }

    return res.status(200).json({
      success: true,
      challenge: await serializeChallenge(challenge, {}, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteChallenge(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const result = await GroupChallenge.deleteOne({ _id: req.params.id, group_id: group._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Challenge not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ── Group goals ──────────────────────────────────────────────────────

async function goalTotal(goal, memberIds) {
  if (goal.metric === 'manual') {
    return Object.values(goal.contributions || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  const values = await Promise.all(
    memberIds.map((id) => computeMetric(id, goal.metric, goal.start_date, goal.end_date))
  );
  return values.reduce((s, v) => s + v, 0);
}

async function serializeGroupGoal(goal, memberIds, currentUserId) {
  const total = await goalTotal(goal, memberIds);
  return {
    id: goal._id,
    title: goal.title,
    description: goal.description,
    metric: goal.metric,
    target: goal.target,
    period: goal.period,
    start_date: goal.start_date,
    end_date: goal.end_date,
    archived: goal.archived,
    // Only the collective total is exposed — never a per-member breakdown.
    total,
    percent: goal.target ? Math.min(100, Math.round((total / goal.target) * 100)) : 0,
    reached: total >= goal.target,
    my_contribution: Number((goal.contributions || {})[currentUserId.toString()]) || 0,
  };
}

async function listGroupGoals(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const query = { group_id: group._id };
    if (req.query.include_archived !== 'true') query.archived = false;

    const goals = await GroupGoal.find(query).sort({ start_date: -1 });
    const memberIds = group.users.map((u) => u.toString());
    const payload = await Promise.all(goals.map((g) => serializeGroupGoal(g, memberIds, req.user._id)));
    return res.status(200).json({ goals: payload });
  } catch (err) {
    next(err);
  }
}

async function createGroupGoal(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const { title, description, metric, target, period, start_date, end_date } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });
    if (start_date > end_date) return res.status(400).json({ error: 'start_date cannot be after end_date' });

    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget) || numericTarget < 1) {
      return res.status(400).json({ error: 'target must be a positive number' });
    }
    if (metric && metric !== 'manual' && !METRICS.includes(metric)) {
      return res.status(400).json({ error: `metric must be one of: ${METRICS.join(', ')}` });
    }

    const goal = await GroupGoal.create({
      group_id: group._id,
      created_by: req.user._id,
      title: String(title).trim(),
      description: description || '',
      metric: metric || 'manual',
      target: numericTarget,
      period: period || 'monthly',
      start_date,
      end_date,
    });

    const memberIds = group.users.map((u) => u.toString());
    return res.status(200).json({
      success: true,
      goal: await serializeGroupGoal(goal, memberIds, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function contributeToGroupGoal(req, res, next) {
  try {
    const group = await requireMembership(req, res);
    if (!group) return;

    const goal = await GroupGoal.findOne({ _id: req.params.id, group_id: group._id });
    if (!goal) return res.status(404).json({ error: 'Group goal not found' });
    if (goal.metric !== 'manual') {
      return res.status(400).json({ error: 'This goal adds up your tracked activity automatically' });
    }

    const delta = req.body.delta === undefined ? 1 : Number(req.body.delta);
    if (!Number.isFinite(delta)) return res.status(400).json({ error: 'delta must be a number' });

    const uid = req.user._id.toString();
    const contributions = { ...(goal.contributions || {}) };
    const before = Object.values(contributions).reduce((s, v) => s + (Number(v) || 0), 0);
    contributions[uid] = Math.max(0, (Number(contributions[uid]) || 0) + delta);
    goal.contributions = contributions;
    goal.markModified('contributions');
    await goal.save();

    const after = Object.values(contributions).reduce((s, v) => s + (Number(v) || 0), 0);
    if (before < goal.target && after >= goal.target) {
      await emitFeedEvent(group._id, req.user, 'group_goal_reached', { title: goal.title });
    }

    const memberIds = group.users.map((u) => u.toString());
    return res.status(200).json({
      success: true,
      goal: await serializeGroupGoal(goal, memberIds, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function updateGroupGoal(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const goal = await GroupGoal.findOne({ _id: req.params.id, group_id: group._id });
    if (!goal) return res.status(404).json({ error: 'Group goal not found' });

    const { title, description, target, start_date, end_date, archived } = req.body;
    if (title !== undefined) goal.title = String(title).trim();
    if (description !== undefined) goal.description = description;
    if (target !== undefined) {
      const numericTarget = Number(target);
      if (!Number.isFinite(numericTarget) || numericTarget < 1) {
        return res.status(400).json({ error: 'target must be a positive number' });
      }
      goal.target = numericTarget;
    }
    if (start_date !== undefined) goal.start_date = start_date;
    if (end_date !== undefined) goal.end_date = end_date;
    if (goal.start_date > goal.end_date) {
      return res.status(400).json({ error: 'start_date cannot be after end_date' });
    }
    if (archived !== undefined) goal.archived = archived === true || archived === 'true';

    await goal.save();
    const memberIds = group.users.map((u) => u.toString());
    return res.status(200).json({
      success: true,
      goal: await serializeGroupGoal(goal, memberIds, req.user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteGroupGoal(req, res, next) {
  try {
    const group = await requireMembership(req, res, { adminOnly: true });
    if (!group) return;

    const result = await GroupGoal.deleteOne({ _id: req.params.id, group_id: group._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Group goal not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  isGroupAdmin,
  requireMembership,
  emitFeedEvent,
  listChallenges,
  createChallenge,
  updateChallenge,
  joinChallenge,
  leaveChallenge,
  reportChallengeProgress,
  deleteChallenge,
  listGroupGoals,
  createGroupGoal,
  updateGroupGoal,
  contributeToGroupGoal,
  deleteGroupGoal,
};
