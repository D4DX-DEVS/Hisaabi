const { GoodDeedLog, ActivityLog } = require('../models');
const { getCurrentDate } = require('../utils/dateUtils');

// Predefined deeds shipped with the app. `custom:<slug>` keys are user-created
// and stored in User.settings.good_deeds so they survive across devices.
const CATALOG = [
  { key: 'sadaqah', category: 'sadaqah' },
  { key: 'helping_others', category: 'service' },
  { key: 'visiting_relatives', category: 'family' },
  { key: 'visiting_sick', category: 'service' },
  { key: 'serving_parents', category: 'family' },
  { key: 'community_service', category: 'community' },
  { key: 'islamic_study', category: 'learning' },
];

function customDeeds(user) {
  const s = (user.settings && user.settings.good_deeds) || [];
  return Array.isArray(s) ? s : [];
}

function serialize(r) {
  return {
    id: r._id,
    date: r.date,
    deed_key: r.deed_key,
    label: r.label,
    category: r.category,
    count: r.count,
    notes: r.notes,
    duration_minutes: r.duration_minutes,
  };
}

async function getCatalog(req, res, next) {
  try {
    return res.status(200).json({
      predefined: CATALOG,
      custom: customDeeds(req.user),
    });
  } catch (err) {
    next(err);
  }
}

async function addCustomDeed(req, res, next) {
  try {
    const user = req.user;
    const { label, category, icon } = req.body;
    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: 'label is required' });
    }

    const slug = String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!slug) return res.status(400).json({ error: 'label must contain letters or numbers' });

    const key = `custom:${slug}`;
    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    const list = Array.isArray(settings.good_deeds) ? settings.good_deeds : [];

    if (list.some((d) => d.key === key)) {
      return res.status(400).json({ error: 'A custom activity with that name already exists' });
    }

    list.push({ key, label: String(label).trim(), category: category || 'other', icon: icon || null });
    settings.good_deeds = list;
    user.settings = settings;
    user.markModified('settings');
    await user.save();

    return res.status(200).json({ success: true, custom: list });
  } catch (err) {
    next(err);
  }
}

async function deleteCustomDeed(req, res, next) {
  try {
    const user = req.user;
    const key = req.params.key;
    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    const list = Array.isArray(settings.good_deeds) ? settings.good_deeds : [];
    const next_ = list.filter((d) => d.key !== key);
    if (next_.length === list.length) {
      return res.status(404).json({ error: 'Custom activity not found' });
    }
    settings.good_deeds = next_;
    user.settings = settings;
    user.markModified('settings');
    await user.save();
    // Past logs are intentionally kept — removing the activity from the list
    // must not erase a record of good the user already did.
    return res.status(200).json({ success: true, custom: next_ });
  } catch (err) {
    next(err);
  }
}

async function getDeeds(req, res, next) {
  try {
    const userId = req.user._id;
    const { date, start_date, end_date } = req.query;

    const query = { user_id: userId };
    if (start_date && end_date) {
      query.date = { $gte: start_date, $lte: end_date };
    } else {
      query.date = date || getCurrentDate();
    }

    const records = await GoodDeedLog.find(query).sort({ date: -1 });
    return res.status(200).json({ deeds: records.map(serialize) });
  } catch (err) {
    next(err);
  }
}

async function logDeed(req, res, next) {
  try {
    const userId = req.user._id;
    const { deed_key, label, category, count, notes, duration_minutes, date } = req.body;
    if (!deed_key) return res.status(400).json({ error: 'deed_key is required' });

    const targetDate = date || getCurrentDate();
    const resolvedCount = Number(count);
    const known = CATALOG.find((c) => c.key === deed_key);

    // count 0 means "undo today's entry" — cleaner than a separate delete call
    // from a tap-to-toggle UI.
    if (count !== undefined && (!Number.isFinite(resolvedCount) || resolvedCount < 0)) {
      return res.status(400).json({ error: 'count must be a non-negative number' });
    }
    if (resolvedCount === 0) {
      await GoodDeedLog.deleteOne({ user_id: userId, date: targetDate, deed_key });
      return res.status(200).json({ success: true, removed: true, date: targetDate, deed_key });
    }

    const record = await GoodDeedLog.findOneAndUpdate(
      { user_id: userId, date: targetDate, deed_key },
      {
        $set: {
          label: label || (known ? null : deed_key.replace(/^custom:/, '').replace(/_/g, ' ')),
          category: category || (known ? known.category : 'other'),
          count: Number.isFinite(resolvedCount) && resolvedCount > 0 ? resolvedCount : 1,
          notes: notes === undefined ? null : notes,
          duration_minutes: duration_minutes === undefined ? null : duration_minutes,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    ActivityLog.create({
      user_id: userId,
      date: targetDate,
      activity_type: 'good_deed',
      details: { deed_key, count: record.count },
    }).catch(() => {});

    return res.status(200).json({ success: true, deed: serialize(record) });
  } catch (err) {
    next(err);
  }
}

async function deleteDeed(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await GoodDeedLog.deleteOne({ _id: req.params.id, user_id: userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Deed log not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { CATALOG, getCatalog, addCustomDeed, deleteCustomDeed, getDeeds, logDeed, deleteDeed };
