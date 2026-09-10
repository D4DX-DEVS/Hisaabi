const adhan = require('adhan');

/**
 * Server-side prayer times, computed the same way the app computes them.
 *
 * Needed so the exemption rule can be worked out on read rather than trusting
 * an answer the app cached when a cycle was created. If the user travels
 * mid-cycle, or changes calculation method afterwards, the boundary days are
 * still judged against the times that actually applied.
 *
 * The app's own settings are mirrored exactly: same method, same madhab, and
 * the same high-latitude rule, so the two never disagree.
 */

const FARDH_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// The app stores its method as the snake_case name from the Dart package.
const METHODS = {
  muslim_world_league: 'MuslimWorldLeague',
  north_america: 'NorthAmerica',
  umm_al_qura: 'UmmAlQura',
  egyptian: 'Egyptian',
  karachi: 'Karachi',
  dubai: 'Dubai',
  qatar: 'Qatar',
  kuwait: 'Kuwait',
  singapore: 'Singapore',
  turkey: 'Turkey',
  tehran: 'Tehran',
  moon_sighting_committee: 'MoonsightingCommittee',
  other: 'Other',
};

/**
 * The prayer location the user's app last reported, or null when it never has.
 * Without it there is nothing to compute from and callers fall back.
 */
function prayerLocation(user) {
  const loc = user && user.settings && user.settings.prayer_location;
  if (!loc || typeof loc !== 'object') return null;

  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    method: typeof loc.method === 'string' ? loc.method : 'muslim_world_league',
    // 0 = Shafi, 1 = Hanafi, matching the app.
    madhab: Number(loc.madhab) === 1 ? 'Hanafi' : 'Shafi',
  };
}

/**
 * The five fardh times for one day at one location, as Date objects.
 * `day` is a YYYY-MM-DD string.
 */
function prayerTimesFor(day, location) {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return null;

  const methodName = METHODS[location.method] || 'MuslimWorldLeague';
  const params = adhan.CalculationMethod[methodName]();
  params.madhab = adhan.Madhab[location.madhab];
  params.highLatitudeRule = adhan.HighLatitudeRule.MiddleOfTheNight;

  const coordinates = new adhan.Coordinates(location.latitude, location.longitude);
  const times = new adhan.PrayerTimes(coordinates, new Date(y, m - 1, d), params);

  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

/**
 * Which prayers on [day] fall inside the window [start, end].
 *
 * Returns null when the times cannot be computed, so the caller can fall back
 * rather than guess — an empty list would wrongly mean "nothing is exempt".
 */
function exemptPrayersOn(day, start, end, location) {
  const times = prayerTimesFor(day, location);
  if (!times) return null;

  const exempt = [];
  for (const name of FARDH_PRAYERS) {
    const at = times[name];
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) continue;
    if (start && at < start) continue;
    if (end && at > end) continue;
    exempt.push(name);
  }
  return exempt;
}

module.exports = { FARDH_PRAYERS, prayerLocation, prayerTimesFor, exemptPrayersOn };
