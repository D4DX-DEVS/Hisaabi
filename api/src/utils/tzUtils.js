/**
 * Timezone helpers built on Intl only (no dependency). Used by the group and
 * challenge reminder schedulers to reason about "local" clock time.
 */
const DEFAULT_TZ = 'Asia/Kolkata';
const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/** Local wall-clock parts of `date` in `timeZone`; weekday is ISO (1=Mon..7=Sun). */
function localParts(date, timeZone) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(date)) {
    parts[p.type] = p.value;
  }
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
    isoWeekday: WEEKDAYS[parts.weekday],
  };
}

/** UTC instant at which the local day containing `date` began in `timeZone`. */
function startOfLocalDayUTC(date, timeZone) {
  const l = localParts(date, timeZone);
  const asUtc = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second);
  const offset = asUtc - Math.floor(date.getTime() / 1000) * 1000;
  return new Date(Date.UTC(l.year, l.month - 1, l.day) - offset);
}

module.exports = { DEFAULT_TZ, isValidTimeZone, localParts, startOfLocalDayUTC };
