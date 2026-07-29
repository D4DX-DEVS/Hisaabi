const { DhikrTracking, ActivityLog, DhikrType } = require('../models');
const { queueStreakUpdate } = require('../services/streakQueueService');
const { getCurrentDate } = require('../utils/dateUtils');

async function getDhikrTracking(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();

    const record = await DhikrTracking.findOne({ user_id: userId, date });
    const dhikr_counts = record ? record.dhikr_counts : {};
    const total_count = Object.values(dhikr_counts).reduce((s, v) => s + v, 0);

    return res.status(200).json({ date, dhikr_counts, total_count });
  } catch (err) {
    next(err);
  }
}

async function updateDhikrCount(req, res, next) {
  try {
    const userId = req.user._id;
    const { dhikr_counts, date } = req.body;
    const targetDate = date || getCurrentDate();

    if (!dhikr_counts || typeof dhikr_counts !== 'object') {
      return res.status(400).json({ error: 'dhikr_counts object is required' });
    }

    for (const [key, val] of Object.entries(dhikr_counts)) {
      if (typeof val !== 'number' || val <= 0) {
        return res.status(400).json({ error: `Count for "${key}" must be a positive integer` });
      }
    }

    let record = await DhikrTracking.findOne({ user_id: userId, date: targetDate });
    if (!record) {
      record = new DhikrTracking({ user_id: userId, date: targetDate, dhikr_counts: {} });
    }

    const existing = record.dhikr_counts ? { ...record.dhikr_counts } : {};
    for (const [key, val] of Object.entries(dhikr_counts)) {
      existing[key] = (existing[key] || 0) + val;
    }

    record.dhikr_counts = existing;
    record.markModified('dhikr_counts');
    await record.save();

    // Log each dhikr type
    const logPromises = Object.entries(dhikr_counts).map(([dhikr_type, count]) =>
      ActivityLog.create({
        user_id: userId,
        date: targetDate,
        activity_type: 'dhikr',
        details: { dhikr_type, count },
      })
    );
    Promise.all(logPromises).catch(() => {});

    queueStreakUpdate(userId, 'dhikr');
    queueStreakUpdate(userId, 'combined');

    const total_count = Object.values(record.dhikr_counts).reduce((s, v) => s + v, 0);

    return res.status(200).json({
      success: true,
      date: targetDate,
      dhikr_counts: record.dhikr_counts,
      total_count,
    });
  } catch (err) {
    next(err);
  }
}

async function getDhikrTypeCatalogue(req, res, next) {
  try {
    const types = await DhikrType.find().sort({ created_at: -1 });
    return res.status(200).json({ dhikr_types: types });
  } catch (err) { next(err); }
}

module.exports = { getDhikrTracking, updateDhikrCount, getDhikrTypeCatalogue };
