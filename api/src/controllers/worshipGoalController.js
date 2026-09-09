const { WorshipGoal } = require('../models');
const { computeMetric } = require('../services/worshipMetrics');
const { getCurrentDate, getMonthDateRange } = require('../utils/dateUtils');

const METRICS = require('../models/WorshipGoal').METRICS;

/**
 * Inclusive window for the period containing `dateStr`.
 * Weeks start Monday; months are calendar months.
 */
function periodBounds(period, dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const fmt = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

  if (period === 'weekly') {
    const dow = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (period === 'monthly') {
    const r = getMonthDateRange(d.getFullYear(), d.getMonth() + 1);
    return { start: r.start_date, end: r.end_date };
  }
  return { start: dateStr, end: dateStr };
}

async function goalWithProgress(goal, dateStr) {
  const { start, end } = periodBounds(goal.period, dateStr);
  const current =
    goal.metric === 'manual'
      ? Number((goal.manual_progress || {})[start]) || 0
      : await computeMetric(goal.user_id, goal.metric, start, end);

  return {
    id: goal._id,
    title: goal.title,
    metric: goal.metric,
    target: goal.target,
    period: goal.period,
    icon: goal.icon,
    color: goal.color,
    active: goal.active,
    shared_with_groups: goal.shared_with_groups,
    period_start: start,
    period_end: end,
    current,
    // Capped so a bar never overflows; `current` keeps the true number.
    percent: goal.target ? Math.min(100, Math.round((current / goal.target) * 100)) : 0,
    completed: current >= goal.target,
  };
}

async function listGoals(req, res, next) {
  try {
    const userId = req.user._id;
    const dateStr = req.query.date || getCurrentDate();
    const query = { user_id: userId };
    if (req.query.include_inactive !== 'true') query.active = true;
    if (req.query.period) query.period = req.query.period;

    const goals = await WorshipGoal.find(query).sort({ created_at: 1 });
    const withProgress = await Promise.all(goals.map((g) => goalWithProgress(g, dateStr)));
    return res.status(200).json({ date: dateStr, goals: withProgress });
  } catch (err) {
    next(err);
  }
}

async function createGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const { title, metric, target, period, icon, color } = req.body;

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget) || numericTarget < 1) {
      return res.status(400).json({ error: 'target must be a positive number' });
    }
    if (metric && !METRICS.includes(metric)) {
      return res.status(400).json({ error: `metric must be one of: ${METRICS.join(', ')}` });
    }
    if (period && !['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'period must be daily, weekly or monthly' });
    }

    const goal = await WorshipGoal.create({
      user_id: userId,
      title: String(title).trim(),
      metric: metric || 'manual',
      target: numericTarget,
      period: period || 'daily',
      icon: icon || null,
      color: color || null,
    });

    return res.status(200).json({ success: true, goal: await goalWithProgress(goal, getCurrentDate()) });
  } catch (err) {
    next(err);
  }
}

async function updateGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const goal = await WorshipGoal.findOne({ _id: req.params.id, user_id: userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { title, metric, target, period, icon, color, active } = req.body;
    if (title !== undefined) goal.title = String(title).trim();
    if (metric !== undefined) {
      if (!METRICS.includes(metric)) {
        return res.status(400).json({ error: `metric must be one of: ${METRICS.join(', ')}` });
      }
      goal.metric = metric;
    }
    if (target !== undefined) {
      const numericTarget = Number(target);
      if (!Number.isFinite(numericTarget) || numericTarget < 1) {
        return res.status(400).json({ error: 'target must be a positive number' });
      }
      goal.target = numericTarget;
    }
    if (period !== undefined) {
      if (!['daily', 'weekly', 'monthly'].includes(period)) {
        return res.status(400).json({ error: 'period must be daily, weekly or monthly' });
      }
      goal.period = period;
    }
    if (icon !== undefined) goal.icon = icon;
    if (color !== undefined) goal.color = color;
    if (active !== undefined) goal.active = active === true || active === 'true';

    await goal.save();
    return res.status(200).json({ success: true, goal: await goalWithProgress(goal, getCurrentDate()) });
  } catch (err) {
    next(err);
  }
}

/**
 * Advance a manual goal's tally for its current period.
 * `delta` may be negative; the tally never drops below zero.
 */
async function incrementGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const goal = await WorshipGoal.findOne({ _id: req.params.id, user_id: userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.metric !== 'manual') {
      return res.status(400).json({
        error: 'Only manual goals can be incremented; others are derived from your tracked activity',
      });
    }

    const dateStr = req.body.date || getCurrentDate();
    const delta = req.body.delta === undefined ? 1 : Number(req.body.delta);
    if (!Number.isFinite(delta)) return res.status(400).json({ error: 'delta must be a number' });

    const { start } = periodBounds(goal.period, dateStr);
    const progress = { ...(goal.manual_progress || {}) };
    progress[start] = Math.max(0, (Number(progress[start]) || 0) + delta);
    goal.manual_progress = progress;
    goal.markModified('manual_progress');
    await goal.save();

    return res.status(200).json({ success: true, goal: await goalWithProgress(goal, dateStr) });
  } catch (err) {
    next(err);
  }
}

async function deleteGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await WorshipGoal.deleteOne({ _id: req.params.id, user_id: userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Goal not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Opt a goal in or out of a specific group. Goals are private by default;
 * this is the only way one becomes visible to a group aggregate.
 */
async function shareGoal(req, res, next) {
  try {
    const userId = req.user._id;
    const goal = await WorshipGoal.findOne({ _id: req.params.id, user_id: userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { group_id, shared } = req.body;
    if (!group_id) return res.status(400).json({ error: 'group_id is required' });

    const current = (goal.shared_with_groups || []).map(String);
    const isShared = shared === true || shared === 'true';
    goal.shared_with_groups = isShared
      ? [...new Set([...current, String(group_id)])]
      : current.filter((g) => g !== String(group_id));

    await goal.save();
    return res.status(200).json({ success: true, shared_with_groups: goal.shared_with_groups });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  periodBounds,
  goalWithProgress,
  listGoals,
  createGoal,
  updateGoal,
  incrementGoal,
  deleteGoal,
  shareGoal,
};
