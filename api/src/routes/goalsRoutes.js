const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getGoalSettings,
  updateGoalSettings,
  removeGoalSettingsKeys,
  getGoalProgress,
  getGoalProgressCalendar,
  getMemorizationGoals,
  createMemorizationGoal,
  updateMemorizationGoal,
  deleteMemorizationGoal,
  getMemorizationProgress,
  getMemorizationProgressCalendar,
} = require('../controllers/goalsController');

router.use(authenticate);

// Daily goal settings
router.get('/settings', getGoalSettings);
router.put('/settings', updateGoalSettings);
router.delete('/settings', removeGoalSettingsKeys);

// Daily goal progress — specific paths before parameterized
router.get('/progress/calendar', getGoalProgressCalendar);
router.get('/progress', getGoalProgress);

// Memorization goals — specific paths before parameterized
router.get('/memorization/progress/calendar', getMemorizationProgressCalendar);
router.get('/memorization/progress', getMemorizationProgress);
router.get('/memorization', getMemorizationGoals);
router.post('/memorization', createMemorizationGoal);
router.put('/memorization/:id', updateMemorizationGoal);
router.delete('/memorization/:id', deleteMemorizationGoal);

module.exports = router;
