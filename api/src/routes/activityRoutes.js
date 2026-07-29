const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTodayProgress, getActivityCalendar } = require('../controllers/activityController');

router.use(authenticate);
router.get('/', getTodayProgress);
router.get('/calendar', getActivityCalendar);

module.exports = router;
