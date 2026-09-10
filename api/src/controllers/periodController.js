const { PeriodTracking } = require('../models');

/**
 * Resolve the moment a cycle starts or ends.
 *
 * The client sends an explicit timestamp when the user picked one, or when
 * she tapped "start now" / "end now". Without one we fall back to the edge of
 * the day, which keeps a date-only client behaving exactly as before:
 * `edge: 'start'` gives 00:00 so the whole day is covered, `edge: 'end'`
 * gives 23:59:59.999.
 */
function resolveMoment(explicit, dateStr, edge) {
  if (explicit) {
    const parsed = new Date(explicit);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (!dateStr) return null;
  const suffix = edge === 'end' ? 'T23:59:59.999' : 'T00:00:00.000';
  const parsed = new Date(`${dateStr}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Day string (YYYY-MM-DD) a moment falls on, in server-local time. */
function dayOf(moment) {
  const y = moment.getFullYear();
  const m = String(moment.getMonth() + 1).padStart(2, '0');
  const d = String(moment.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function serialize(record) {
  return {
    id: record._id,
    start_date: record.start_date,
    end_date: record.end_date,
    start_at: record.start_at,
    end_at: record.end_at,
    notes: record.notes,
    created_at: record.created_at,
  };
}

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
    const periods = records.map(serialize);
    return res.status(200).json({ periods });
  } catch (err) {
    next(err);
  }
}

async function addPeriod(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const { start_date, end_date, notes, start_at, end_at } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    if (start_date > end_date) {
      return res.status(400).json({ error: 'start_date cannot be after end_date' });
    }

    const startMoment = resolveMoment(start_at, start_date, 'start');
    const endMoment = resolveMoment(end_at, end_date, 'end');
    if (startMoment && endMoment && startMoment > endMoment) {
      return res.status(400).json({ error: 'The cycle cannot end before it starts' });
    }
    // A supplied timestamp is authoritative — keep the day string agreeing
    // with it so range queries and the exact moment never disagree.
    const resolvedStartDate = start_at && startMoment ? dayOf(startMoment) : start_date;
    const resolvedEndDate = end_at && endMoment ? dayOf(endMoment) : end_date;

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

    const record = await PeriodTracking.create({
      user_id: userId,
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      start_at: startMoment,
      end_at: endMoment,
      notes: notes || null,
    });
    return res.status(200).json({ success: true, period: serialize(record) });
  } catch (err) {
    next(err);
  }
}

async function updatePeriod(req, res, next) {
  try {
    if (!requireFemale(req, res)) return;
    const userId = req.user._id;
    const { id } = req.params;
    const { start_date, end_date, notes, start_at, end_at } = req.body;

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

    // Re-resolve a moment whenever its timestamp or its day changes, so
    // editing the date never leaves a stale time behind on the other field.
    if (start_at !== undefined || start_date) {
      record.start_at = resolveMoment(start_at, record.start_date, 'start');
    }
    if (end_at !== undefined || end_date) {
      record.end_at = resolveMoment(end_at, record.end_date, 'end');
    }
    if (record.start_at && record.end_at && record.start_at > record.end_at) {
      return res.status(400).json({ error: 'The cycle cannot end before it starts' });
    }

    await record.save();

    return res.status(200).json({ success: true, period: serialize(record) });
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
