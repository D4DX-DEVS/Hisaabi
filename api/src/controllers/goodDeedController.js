const { GoodDeedLog, ActivityLog } = require('../models');
const { getCurrentDate, latestAllowedDate } = require('../utils/dateUtils');
const { assertString, isYmd } = require('../utils/inputGuard');
const { sameName } = require('../utils/duplicateGuard');

// A person's own list of custom habits stays a sensible size.
const MAX_CUSTOM_DEEDS = 50;

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
    const { category, icon, kind, target } = req.body;
    if (!req.body.label || !String(req.body.label).trim()) {
      return res.status(400).json({ error: 'label is required' });
    }
    const label = assertString(req.body.label, 'label', 60);

    // Letters and digits make a readable key. A name with none of them in the
    // Latin alphabet (Arabic, Urdu, Malayalam) used to be refused outright; it
    // gets a unique key instead.
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    const list = Array.isArray(settings.good_deeds) ? settings.good_deeds : [];

    // The same name twice (in any language) is a duplicate.
    if (list.some((d) => sameName(d.label, label))) {
      return res.status(400).json({ error: 'A custom activity with that name already exists' });
    }
    // Different names that make the same key ("Read-Quran", "Read Quran") get
    // their own key rather than clobbering each other.
    const base = `custom:${slug || `h${Date.now().toString(36)}`}`;
    let key = base;
    for (let n = 2; list.some((d) => d.key === key); n++) key = `${base}_${n}`;
    if (list.length >= MAX_CUSTOM_DEEDS) {
      return res.status(400).json({ error: `You can keep up to ${MAX_CUSTOM_DEEDS} custom activities` });
    }

    // A habit is either ticked (done / not done) or counted, optionally with a daily target.
    const habitKind = kind === 'tick' ? 'tick' : 'count';
    const dailyTarget = habitKind === 'count' && Number(target) >= 1 ? Math.min(Math.floor(Number(target)), 10000) : null;

    list.push({
      key,
      label,
      category: typeof category === 'string' && category.length <= 40 ? category : 'other',
      icon: typeof icon === 'string' && icon.length <= 40 ? icon : null,
      kind: habitKind,
      target: dailyTarget,
    });
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
    // Removing a habit removes it everywhere: its logs go too, so it no longer
    // counts in today's total, the weekly/monthly report or the totals.
    await GoodDeedLog.deleteMany({ user_id: user._id, deed_key: key });
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
    const { label, category, count, notes, duration_minutes, date } = req.body;
    if (!req.body.deed_key) return res.status(400).json({ error: 'deed_key is required' });
    const deed_key = assertString(req.body.deed_key, 'deed_key', 80);

    const targetDate = date || getCurrentDate();
    if (!isYmd(targetDate)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    if (targetDate > latestAllowedDate()) {
      return res.status(400).json({ error: 'Cannot log this for a day that has not come yet' });
    }
    if (label !== undefined && label !== null && (typeof label !== 'string' || label.length > 80)) {
      return res.status(400).json({ error: 'label must be text of at most 80 characters' });
    }
    if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ error: 'notes must be text of at most 500 characters' });
    }
    if (duration_minutes !== undefined && duration_minutes !== null
      && !(Number.isFinite(Number(duration_minutes)) && Number(duration_minutes) >= 0 && Number(duration_minutes) <= 1440)) {
      return res.status(400).json({ error: 'duration_minutes must be between 0 and 1440' });
    }
    const resolvedCount = Math.floor(Number(count));
    const known = CATALOG.find((c) => c.key === deed_key);

    // count 0 means "undo today's entry" — cleaner than a separate delete call
    // from a tap-to-toggle UI.
    if (count !== undefined && (!Number.isFinite(resolvedCount) || resolvedCount < 0 || resolvedCount > 10000)) {
      return res.status(400).json({ error: 'count must be a whole number from 0 to 10000' });
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
          category: (typeof category === 'string' && category.length <= 40 ? category : null) || (known ? known.category : 'other'),
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
