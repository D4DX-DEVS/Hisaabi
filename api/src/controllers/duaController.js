const { DuaMemorization, ActivityLog, Dua } = require('../models');
const { getCurrentDate } = require('../utils/dateUtils');

async function getMemorizedDuas(req, res, next) {
  try {
    const userId = req.user._id;
    const record = await DuaMemorization.findOne({ user_id: userId });
    return res.status(200).json({ memorized_duas: record ? record.memorized_duas : [] });
  } catch (err) {
    next(err);
  }
}

async function addMemorizedDua(req, res, next) {
  try {
    const userId = req.user._id;
    const { dua_id } = req.body;
    if (!dua_id) {
      return res.status(400).json({ error: 'dua_id is required' });
    }

    let record = await DuaMemorization.findOne({ user_id: userId });
    if (!record) {
      record = new DuaMemorization({ user_id: userId, memorized_duas: [] });
    }

    const alreadyExists = record.memorized_duas.some((d) => d.dua_id === dua_id);
    if (!alreadyExists) {
      const duas = [...record.memorized_duas, { dua_id, memorized_at: new Date().toISOString() }];
      record.memorized_duas = duas;
      record.markModified('memorized_duas');
      await record.save();

      ActivityLog.create({
        user_id: userId,
        date: getCurrentDate(),
        activity_type: 'dua_memorization',
        details: { dua_id },
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, memorized_duas: record.memorized_duas });
  } catch (err) {
    next(err);
  }
}

async function removeMemorizedDua(req, res, next) {
  try {
    const userId = req.user._id;
    const { dua_id } = req.params;

    const record = await DuaMemorization.findOne({ user_id: userId });
    if (!record) {
      return res.status(404).json({ error: 'No memorization record found' });
    }

    const idx = record.memorized_duas.findIndex((d) => d.dua_id === dua_id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Dua not found in memorized list' });
    }

    record.memorized_duas.splice(idx, 1);
    record.markModified('memorized_duas');
    await record.save();

    return res.status(200).json({ success: true, memorized_duas: record.memorized_duas });
  } catch (err) {
    next(err);
  }
}

async function resetMemorization(req, res, next) {
  try {
    const userId = req.user._id;
    let record = await DuaMemorization.findOne({ user_id: userId });
    if (!record) {
      record = new DuaMemorization({ user_id: userId, memorized_duas: [] });
    } else {
      record.memorized_duas = [];
      record.markModified('memorized_duas');
    }
    await record.save();

    return res.status(200).json({ success: true, message: 'Dua memorization reset successfully' });
  } catch (err) {
    next(err);
  }
}

async function getDuaCatalogue(req, res, next) {
  try {
    const duas = await Dua.find().populate('category').sort({ created_at: -1 });
    return res.status(200).json({ duas });
  } catch (err) { next(err); }
}

module.exports = { getMemorizedDuas, addMemorizedDua, removeMemorizedDua, resetMemorization, getDuaCatalogue };
