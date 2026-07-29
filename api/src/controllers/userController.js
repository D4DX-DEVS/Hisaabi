const { User } = require('../models');

const DEFAULT_FEMALE_SETTINGS = {
  period_tracking: true,
  maintain_streaks_during_period: true,
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function deleteByDotPath(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined || current[parts[i]] === null) return;
    current = current[parts[i]];
  }
  delete current[parts[parts.length - 1]];
}

async function getProfile(req, res, next) {
  try {
    const user = req.user;
    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      dob: user.dob,
      gender: user.gender,
      settings: user.settings,
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = req.user;
    const { name, email, dob, gender } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (dob !== undefined) user.dob = dob;

    if (gender === 'm' || gender === 'f') {
      const prevGender = user.gender;
      user.gender = gender;

      if (gender === 'f' && prevGender !== 'f') {
        const settings = user.settings || {};
        settings.female_settings = DEFAULT_FEMALE_SETTINGS;
        user.settings = settings;
        user.markModified('settings');
      } else if (gender === 'm' && prevGender === 'f') {
        const settings = user.settings || {};
        delete settings.female_settings;
        user.settings = settings;
        user.markModified('settings');
      }
    }

    await user.save();

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      dob: user.dob,
      gender: user.gender,
    });
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    return res.status(200).json(req.user.settings || {});
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const user = req.user;
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const merged = deepMerge(user.settings || {}, settings);
    user.settings = merged;
    user.markModified('settings');
    await user.save();

    return res.status(200).json(user.settings);
  } catch (err) {
    next(err);
  }
}

async function removeSettingsKeys(req, res, next) {
  try {
    const user = req.user;
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys array is required' });
    }

    const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
    for (const k of keys) {
      deleteByDotPath(settings, k);
    }

    user.settings = settings;
    user.markModified('settings');
    await user.save();

    return res.status(200).json(user.settings);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = req.user;
    const { confirm } = req.body;
    if (confirm !== true) {
      return res.status(400).json({ error: 'Request body must include { "confirm": true } to delete account' });
    }

    await user.deleteOne();
    return res.status(200).json({ message: 'Account deleted successfully. All associated data has been removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, getSettings, updateSettings, removeSettingsKeys, deleteUser };
