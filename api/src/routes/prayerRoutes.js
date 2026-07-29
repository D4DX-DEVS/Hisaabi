const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getPrayerTracking, updateFardhPrayer, updateSunnahPrayer, getFardhPrayerAnalysis,
} = require('../controllers/prayerController');

router.use(authenticate);
router.get('/', getPrayerTracking);
router.post('/fardh', updateFardhPrayer);
router.post('/sunnah', updateSunnahPrayer);
router.get('/analysis', getFardhPrayerAnalysis);

module.exports = router;
