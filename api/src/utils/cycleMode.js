/**
 * Personal Cycle Mode is on by default for women and stays a switch they can
 * turn off in Settings. A stored true/false always wins; only a user with no
 * stored choice falls back to their profile gender.
 */
function femaleSettings(user) {
  return user && user.settings && user.settings.female_settings
    ? user.settings.female_settings
    : null;
}

function cycleModeOn(user) {
  const fs = femaleSettings(user);
  if (fs && typeof fs.period_tracking === 'boolean') return fs.period_tracking;
  return !!user && user.gender === 'f';
}

/** Whether streaks and prayer figures skip exempt cycle days. */
function keepStreaksDuringCycle(user) {
  const fs = femaleSettings(user);
  if (fs && typeof fs.maintain_streaks_during_period === 'boolean') {
    return fs.maintain_streaks_during_period;
  }
  return !!user && user.gender === 'f';
}

module.exports = { cycleModeOn, keepStreaksDuringCycle };
