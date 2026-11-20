/**
 * Cleans a group's data when a member goes or the group does.
 *
 * Models are looked up by name when called, not imported, because the User and
 * Group models call this from their delete hooks and importing them here would
 * be circular.
 */
const mongoose = require('mongoose');

const has = (name) => mongoose.modelNames().includes(name);

/**
 * Take one member out of a group's challenges, goals, activities and feed, so
 * their numbers stop counting in group totals and their feed items go.
 */
async function removeMemberData(groupId, userId) {
  const jobs = [];
  if (has('GroupChallenge')) {
    jobs.push(mongoose.model('GroupChallenge').updateMany(
      { group_id: groupId },
      { $pull: { participants: { user_id: userId } } }
    ));
  }
  if (has('GroupGoal')) {
    jobs.push(mongoose.model('GroupGoal').updateMany(
      { group_id: groupId },
      { $unset: { [`contributions.${userId}`]: '' } }
    ));
  }
  if (has('GroupActivity')) {
    jobs.push(mongoose.model('GroupActivity').updateMany(
      { group_id: groupId },
      { $pull: { user_status: { user: userId } } }
    ));
  }
  if (has('GroupFeedEvent')) {
    const Feed = mongoose.model('GroupFeedEvent');
    jobs.push(Feed.deleteMany({ group_id: groupId, user_id: userId }));
    jobs.push(Feed.updateMany(
      { group_id: groupId },
      { $pull: { reactions: { user_id: userId }, notified_by: userId } }
    ));
  }
  await Promise.all(jobs);
}

/** Delete everything that belongs to a group (not the group document itself). */
async function deleteGroupData(groupId) {
  const names = ['GroupActivity', 'GroupChallenge', 'GroupGoal', 'GroupFeedEvent', 'GroupReminder'];
  await Promise.all(
    names.filter(has).map((n) => mongoose.model(n).deleteMany({ group_id: groupId }))
  );
}

module.exports = { removeMemberData, deleteGroupData };
