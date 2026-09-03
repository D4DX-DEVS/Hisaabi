const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  listChallenges,
  createChallenge,
  updateChallenge,
  joinChallenge,
  leaveChallenge,
  reportChallengeProgress,
  deleteChallenge,
  listGroupGoals,
  createGroupGoal,
  updateGroupGoal,
  contributeToGroupGoal,
  deleteGroupGoal,
} = require('../controllers/groupChallengeController');
const {
  getGroupDashboard,
  getFeed,
  reactToEvent,
  postMilestone,
  listReminders,
  createReminder,
  deleteReminder,
  getMySettings,
  updateMySettings,
} = require('../controllers/groupSpaceController');

router.use(authenticate);

// Dashboard
router.get('/:group_id/dashboard', getGroupDashboard);

// Challenges
router.get('/:group_id/challenges', listChallenges);
router.post('/:group_id/challenges', createChallenge);
router.post('/:group_id/challenges/:id/join', joinChallenge);
router.post('/:group_id/challenges/:id/leave', leaveChallenge);
router.patch('/:group_id/challenges/:id/progress', reportChallengeProgress);
router.put('/:group_id/challenges/:id', updateChallenge);
router.delete('/:group_id/challenges/:id', deleteChallenge);

// Group goals
router.get('/:group_id/goals', listGroupGoals);
router.post('/:group_id/goals', createGroupGoal);
router.patch('/:group_id/goals/:id/contribute', contributeToGroupGoal);
router.put('/:group_id/goals/:id', updateGroupGoal);
router.delete('/:group_id/goals/:id', deleteGroupGoal);

// Activity feed + encouragement
router.get('/:group_id/feed', getFeed);
router.post('/:group_id/feed', postMilestone);
router.post('/:group_id/feed/:id/react', reactToEvent);

// Reminders
router.get('/:group_id/reminders', listReminders);
router.post('/:group_id/reminders', createReminder);
router.delete('/:group_id/reminders/:id', deleteReminder);

// Per-member privacy + notification preferences
router.get('/:group_id/my-settings', getMySettings);
router.put('/:group_id/my-settings', updateMySettings);

module.exports = router;
