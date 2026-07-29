const { PeriodTracking } = require('../models');

function requireFemale(req, res) {
  if (req.user.gender !== 'f') {
    res.status(403).json({ error: 'This feature is only available for female users' });
    return false;
  }
  return true;
}

async function getPeriodHistory(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const records = await PeriodTracking.find({ user_id: userId }).sort({ start_date: -1 });
    const periods = records.map((r) => ({
      id: r._id,
      start_date: r.start_date,
      end_date: r.end_date,
      notes: r.notes,
    }));
    return res.status(200).json({ periods });
  } catch (err) {
    next(err);
  }
}

async function addPeriod(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const { start_date, end_date, notes } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    if (start_date > end_date) {
      return res.status(400).json({ error: 'start_date cannot be after end_date' });
    }

    // Overlap check
    const overlap = await PeriodTracking.findOne({
      user_id: userId,
      $or: [
        { start_date: { $lte: end_date }, end_date: { $gte: start_date } },
      ],
    });
    if (overlap) {
      return res.status(400).json({ error: 'New period overlaps with an existing period' });
    }

    const record = await PeriodTracking.create({ user_id: userId, start_date, end_date, notes: notes || null });
    return res.status(200).json({
      success: true,
      period: { id: record._id, start_date: record.start_date, end_date: record.end_date, notes: record.notes },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePeriod(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const { id } = req.params;
    const { start_date, end_date, notes } = req.body;

    const record = await PeriodTracking.findOne({ _id: id, user_id: userId });
    if (!record) return res.status(404).json({ error: 'Period record not found' });

    const newStart = start_date || record.start_date;
    const newEnd = end_date || record.end_date;

    if (newStart > newEnd) {
      return res.status(400).json({ error: 'start_date cannot be after end_date' });
    }

    if (start_date) record.start_date = start_date;
    if (end_date) record.end_date = end_date;
    if (notes !== undefined) record.notes = notes;
    await record.save();

    return res.status(200).json({
      success: true,
      period: { id: record._id, start_date: record.start_date, end_date: record.end_date, notes: record.notes },
    });
  } catch (err) {
    next(err);
  }
}

async function removePeriod(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const { id } = req.params;

    const record = await PeriodTracking.findOne({ _id: id, user_id: userId });
    if (!record) return res.status(404).json({ error: 'Period record not found' });

    await record.deleteOne();
    return res.status(200).json({ success: true, message: 'Period record removed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPeriodHistory, addPeriod, updatePeriod, removePeriod };
