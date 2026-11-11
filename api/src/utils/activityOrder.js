/**
 * Order a group's activities: the ones the admin has put in order first (by
 * their saved position), then any not yet placed (new ones) newest first.
 *
 * @param {object[]} activities  rows with `sort_order` (number or null) and `date`
 * @returns {object[]} a new array
 */
function sortActivities(activities) {
  const placed = (a) => typeof a.sort_order === 'number';
  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);
  return [
    ...activities.filter(placed).sort((a, b) => a.sort_order - b.sort_order),
    ...activities.filter((a) => !placed(a)).sort(byDateDesc),
  ];
}

module.exports = { sortActivities };
