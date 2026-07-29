const { FastingDay, ActivityLog, FastingType } = require('../models');
const { getCurrentDate } = require('../utils/dateUtils');

const VALID_STATUSES = ['completed', 'broken', 'in_progress'];

async function getFastingStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const date = req.query.date || getCurrentDate();

    const record = await FastingDay.findOne({ user_id: userId, date });
    if (!record) {
      return res.status(200).json({ date, is_fasting: false, fasting_type: null, status: null });
    }
    return res.status(200).json({
      date,
      is_fasting: true,
      fasting_type: record.fasting_type,
      status: record.status,
    });
  } catch (err) {
    next(err);
  }
}

async function updateFastingStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const { fasting_type, status, date } = req.body;
    const targetDate = date || getCurrentDate();

    if (!fasting_type || !status) {
      return res.status(400).json({ error: 'fasting_type and status are required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    let record = await FastingDay.findOne({ user_id: userId, date: targetDate });
    if (!record) {
      record = new FastingDay({ user_id: userId, date: targetDate, fasting_type, status });
    } else {
      record.fasting_type = fasting_type;
      record.status = status;
    }
    await record.save();

    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'fasting',
      details: { fasting_type, status },
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      date: targetDate,
      is_fasting: true,
      fasting_type: record.fasting_type,
      status: record.status,
    });
  } catch (err) {
    next(err);
  }
}

async function removeFastingDay(req, res, next) {
  try {
    const userId = req.user._id;
    const { date } = req.params;

    const record = await FastingDay.findOne({ user_id: userId, date });
    if (!record) {
      return res.status(404).json({ error: 'No fasting record found for the date' });
    }
    await record.deleteOne();

    return res.status(200).json({ success: true, message: 'Fasting record removed successfully' });
  } catch (err) {
    next(err);
  }
}

async function getFastingHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const { start_date, end_date } = req.query;

    const query = { user_id: userId };
    if (start_date && end_date) {
      query.date = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
      query.date = { $gte: start_date };
    } else if (end_date) {
      query.date = { $lte: end_date };
    }

    const records = await FastingDay.find(query).sort({ date: -1 });
    const fasting_days = records.map((r) => ({
      date: r.date,
      fasting_type: r.fasting_type,
      status: r.status,
    }));

    return res.status(200).json({ fasting_days });
  } catch (err) {
    next(err);
  }
}

async function getFastingTypeCatalogue(req, res, next) {
  try {
    const types = await FastingType.find().sort({ created_at: -1 });
    return res.status(200).json({ fasting_types: types });
  } catch (err) { next(err); }
}

module.exports = { getFastingStatus, updateFastingStatus, removeFastingDay, getFastingHistory, getFastingTypeCatalogue };
