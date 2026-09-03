const { AdhkarTracking, DuaTracking, ActivityLog } = require('../models');
const { getCurrentDate } = require('../utils/dateUtils');

function serializeAdhkar(r, date) {
  if (!r) return { date, morning: false, evening: false, personal: [] };
  return { date: r.date, morning: r.morning, evening: r.evening, personal: r.personal || [] };
}

function serializeDua(r, date) {
  if (!r) return { date, selected_duas: [], completed_duas: [] };
  return { date: r.date, selected_duas: r.selected_duas || [], completed_duas: r.completed_duas || [] };
}

// ── Adhkar ───────────────────────────────────────────────────────────

async function getAdhkar(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, start_date, end_date } = req.query;

    if (start_date && end_date) {
      const records = await AdhkarTracking.find({
        user_id: userId,
        date: { $gte: start_date, $lte: end_date },
      }).sort({ date: 1 });
      return res.status(200).json({ adhkar: records.map((r) => serializeAdhkar(r, r.date)) });
    }

    const targetDate = date || getCurrentDate();
    const record = await AdhkarTracking.findOne({ user_id: userId, date: targetDate });
    return res.status(200).json(serializeAdhkar(record, targetDate));
  } catch (err) {
    next(err);
  }
}

async function updateAdhkar(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, morning, evening } = req.body;
    const targetDate = date || getCurrentDate();

    const update = {};
    if (morning !== undefined) update.morning = morning === true || morning === 'true';
    if (evening !== undefined) update.evening = evening === true || evening === 'true';
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'morning or evening is required' });
    }

    const record = await AdhkarTracking.findOneAndUpdate(
      { user_id: userId, date: targetDate },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'adhkar',
      details: update,
    }).catch(() => {});

    return res.status(200).json({ success: true, ...serializeAdhkar(record, targetDate) });
  } catch (err) {
    next(err);
  }
}

/**
 * Create or update one personal dhikr entry for the day.
 * Sending `count` alone advances an existing entry; `target` defines it.
 */
async function updatePersonalDhikr(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, key, label, target, count } = req.body;
    if (!key) return res.status(400).json({ error: 'key is required' });

    const targetDate = date || getCurrentDate();
    const record =
      (await AdhkarTracking.findOne({ user_id: userId, date: targetDate })) ||
      new AdhkarTracking({ user_id: userId, date: targetDate });

    const personal = [...(record.personal || [])];
    const idx = personal.findIndex((p) => p && p.key === key);
    const existing = idx >= 0 ? personal[idx] : { key, label: label || key, target: 1, count: 0 };

    const entry = {
      key,
      label: label !== undefined ? label : existing.label,
      target: target !== undefined ? Math.max(1, Number(target) || 1) : existing.target,
      count: count !== undefined ? Math.max(0, Number(count) || 0) : existing.count,
    };

    if (idx >= 0) personal[idx] = entry;
    else personal.push(entry);

    record.personal = personal;
    record.markModified('personal');
    await record.save();

    return res.status(200).json({ success: true, ...serializeAdhkar(record, targetDate) });
  } catch (err) {
    next(err);
  }
}

async function deletePersonalDhikr(req, res, next) {
  try {
    const userId = req.user._id;
    const targetDate = req.query.date || getCurrentDate();
    const record = await AdhkarTracking.findOne({ user_id: userId, date: targetDate });
    if (!record) return res.status(404).json({ error: 'No adhkar record for that date' });

    const personal = (record.personal || []).filter((p) => p && p.key !== req.params.key);
    record.personal = personal;
    record.markModified('personal');
    await record.save();

    return res.status(200).json({ success: true, ...serializeAdhkar(record, targetDate) });
  } catch (err) {
    next(err);
  }
}

// ── Dua tracking ─────────────────────────────────────────────────────

async function getDuaTracking(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, start_date, end_date } = req.query;

    if (start_date && end_date) {
      const records = await DuaTracking.find({
        user_id: userId,
        date: { $gte: start_date, $lte: end_date },
      }).sort({ date: 1 });
      return res.status(200).json({ dua_tracking: records.map((r) => serializeDua(r, r.date)) });
    }

    const targetDate = date || getCurrentDate();
    const record = await DuaTracking.findOne({ user_id: userId, date: targetDate });
    return res.status(200).json(serializeDua(record, targetDate));
  } catch (err) {
    next(err);
  }
}

/**
 * Set the day's chosen duas and/or mark one complete.
 *
 * `selected_duas` replaces the day's list. `dua_id` + `completed` toggles a
 * single dua, and auto-adds it to the selection so a dua completed straight
 * from the Duas module still shows up as done in the tracker.
 */
async function updateDuaTracking(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, selected_duas, dua_id, completed } = req.body;
    const targetDate = date || getCurrentDate();

    const record =
      (await DuaTracking.findOne({ user_id: userId, date: targetDate })) ||
      new DuaTracking({ user_id: userId, date: targetDate });

    if (Array.isArray(selected_duas)) {
      record.selected_duas = selected_duas.map(String);
      // Drop completions for duas no longer on the list.
      record.completed_duas = (record.completed_duas || []).filter((d) =>
        record.selected_duas.includes(String(d))
      );
    }

    if (dua_id !== undefined) {
      const id = String(dua_id);
      const isDone = completed === undefined ? true : completed === true || completed === 'true';
      const selected = new Set((record.selected_duas || []).map(String));
      const done = new Set((record.completed_duas || []).map(String));

      selected.add(id);
      if (isDone) done.add(id);
      else done.delete(id);

      record.selected_duas = [...selected];
      record.completed_duas = [...done];
    }

    if (!Array.isArray(selected_duas) && dua_id === undefined) {
      return res.status(400).json({ error: 'selected_duas or dua_id is required' });
    }

    await record.save();
    return res.status(200).json({ success: true, ...serializeDua(record, targetDate) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdhkar,
  updateAdhkar,
  updatePersonalDhikr,
  deletePersonalDhikr,
  getDuaTracking,
  updateDuaTracking,
};
