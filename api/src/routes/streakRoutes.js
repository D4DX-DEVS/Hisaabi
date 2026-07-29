const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getAllStreaksController, getStreakByType, updateAllStreaksController,
} = require('../controllers/streakController');

router.use(authenticate);
router.get('/', getAllStreaksController);
router.post('/update', updateAllStreaksController);
router.get('/:type', getStreakByType);

module.exports = router;
