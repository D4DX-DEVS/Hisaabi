const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDashboard, getProgress, getHistory } = require('../controllers/trackerController');

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/progress', getProgress);
router.get('/history', getHistory);

module.exports = router;
