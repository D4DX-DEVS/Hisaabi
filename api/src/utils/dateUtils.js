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

module.exports = { formatDate, getCurrentDate, isDateInRange, getDaysBetweenDates, getMonthDateRange };
