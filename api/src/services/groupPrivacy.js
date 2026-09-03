/**
 * Group sharing rules.
 *
 * Everything a member tracks is private by default. A member becomes part of a
 * group's aggregate only for the categories they explicitly switch on, per
 * group, and even then only as a percentage — never as per-day detail.
 *
 * Shape in User.settings:
 *   privacy: {
 *     appear_in_feed: true,
 *     share: { "<group_id>": { overall: true, quran: true, ... } }
 *   }
 */

// Categories a member may choose to contribute to a group aggregate.
const SHAREABLE = ['overall', 'prayers', 'quran', 'dhikr', 'adhkar', 'fasting', 'good_deeds', 'goals'];

/**
 * Never shared with a group under any setting. Listed explicitly so the rule
 * is enforced in code rather than remembered by convention.
 */
const NEVER_SHARED = [
  'missed_prayers',
  'personal_dua',
  'personal_notes',
  'quran_reading_detail',
  'individual_daily_stats',
  'muhasabah_reflections',
];

function privacySettings(user) {
  const p = (user.settings && user.settings.privacy) || {};
  return {
    appear_in_feed: p.appear_in_feed !== false, // opt-out, not opt-in
    share: p.share && typeof p.share === 'object' ? p.share : {},
  };
}

/**
 * Does this user share `category` with this group? Defaults to false.
 */
function sharesCategory(user, groupId, category) {
  if (!SHAREABLE.includes(category)) return false;
  const { share } = privacySettings(user);
  const forGroup = share[String(groupId)];
  if (!forGroup || typeof forGroup !== 'object') return false;
  return forGroup[category] === true;
}

function appearsInFeed(user) {
  return privacySettings(user).appear_in_feed;
}

/**
 * Merge a partial sharing update into a user's settings and persist it.
 * Unknown categories are ignored rather than rejected, so an older client
 * sending an extra key cannot fail the whole request.
 */
async function updateSharing(user, groupId, updates) {
  const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
  const privacy = settings.privacy && typeof settings.privacy === 'object' ? settings.privacy : {};
  const share = privacy.share && typeof privacy.share === 'object' ? privacy.share : {};
  const forGroup = share[String(groupId)] && typeof share[String(groupId)] === 'object'
    ? share[String(groupId)]
    : {};

  for (const [key, value] of Object.entries(updates || {})) {
    if (!SHAREABLE.includes(key)) continue;
    forGroup[key] = value === true || value === 'true';
  }

  share[String(groupId)] = forGroup;
  privacy.share = share;
  settings.privacy = privacy;
  user.settings = settings;
  user.markModified('settings');
  await user.save();
  return forGroup;
}

async function setAppearInFeed(user, appear) {
  const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
  const privacy = settings.privacy && typeof settings.privacy === 'object' ? settings.privacy : {};
  privacy.appear_in_feed = appear === true || appear === 'true';
  settings.privacy = privacy;
  user.settings = settings;
  user.markModified('settings');
  await user.save();
  return privacy.appear_in_feed;
}

/**
 * Per-group notification preferences (mute, frequency), stored alongside
 * privacy so a member can silence a group without leaving it.
 */
function groupPrefs(user, groupId) {
  const prefs = (user.settings && user.settings.group_prefs) || {};
  const forGroup = prefs[String(groupId)] || {};
  return {
    muted: forGroup.muted === true,
    reminders: forGroup.reminders !== false,
    frequency: forGroup.frequency || 'all', // all | daily_digest | important_only
  };
}

async function updateGroupPrefs(user, groupId, updates) {
  const settings = user.settings ? JSON.parse(JSON.stringify(user.settings)) : {};
  const prefs = settings.group_prefs && typeof settings.group_prefs === 'object' ? settings.group_prefs : {};
  const forGroup = prefs[String(groupId)] && typeof prefs[String(groupId)] === 'object'
    ? prefs[String(groupId)]
    : {};

  if (updates.muted !== undefined) forGroup.muted = updates.muted === true || updates.muted === 'true';
  if (updates.reminders !== undefined) {
    forGroup.reminders = updates.reminders === true || updates.reminders === 'true';
  }
  if (updates.frequency !== undefined && ['all', 'daily_digest', 'important_only'].includes(updates.frequency)) {
    forGroup.frequency = updates.frequency;
  }

  prefs[String(groupId)] = forGroup;
  settings.group_prefs = prefs;
  user.settings = settings;
  user.markModified('settings');
  await user.save();
  return groupPrefs(user, groupId);
}

module.exports = {
  SHAREABLE,
  NEVER_SHARED,
  privacySettings,
  sharesCategory,
  appearsInFeed,
  updateSharing,
  setAppearInFeed,
  groupPrefs,
  updateGroupPrefs,
};
