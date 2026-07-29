const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getFastingStatus, updateFastingStatus, removeFastingDay, getFastingHistory, getFastingTypeCatalogue,
} = require('../controllers/fastingController');

router.use(authenticate);
router.get('/types', getFastingTypeCatalogue);
router.get('/', getFastingStatus);
router.get('/history', getFastingHistory);
router.post('/', updateFastingStatus);
router.delete('/:date', removeFastingDay);

module.exports = router;
