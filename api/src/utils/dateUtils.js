/**
 * Format a Date object (or date string) to YYYY-MM-DD string
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 */
function getCurrentDate() {
  return formatDate(new Date());
}

/**
 * Check if a YYYY-MM-DD date string is within [start, end] inclusive
 */
function isDateInRange(date, start, end) {
  return date >= start && date <= end;
}

/**
 * Get an array of YYYY-MM-DD strings for every day from startDate to endDate (inclusive)
 */
function getDaysBetweenDates(startDate, endDate) {
  // Dates must be real YYYY-MM-DD days and the range at most MAX_RANGE_DAYS,
  // so one request (or one bad stored value) cannot loop for millions of days.
  const { assertDateRange } = require('./inputGuard');
  startDate = typeof startDate === 'string' ? startDate.slice(0, 10) : startDate;
  endDate = typeof endDate === 'string' ? endDate.slice(0, 10) : endDate;
  assertDateRange(startDate, endDate);
  const days = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    days.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Get start and end date strings for a given year+month (1-indexed month)
 */
function getMonthDateRange(year, month) {
  const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end_date = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start_date, end_date };
}

/**
 * The latest day a client may log for: the server's today plus one. Someone whose
 * clock is ahead of the server's (India at 2 am on a UTC server) must not be told
 * that today is "in the future".
 */
function latestAllowedDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

module.exports = {
  formatDate, getCurrentDate, isDateInRange, getDaysBetweenDates, getMonthDateRange, latestAllowedDate,
};
