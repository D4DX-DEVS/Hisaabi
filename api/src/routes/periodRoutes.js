const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPeriodHistory, addPeriod, updatePeriod, removePeriod } = require('../controllers/periodController');

router.use(authenticate);
router.get('/', getPeriodHistory);
router.post('/', addPeriod);
router.put('/:id', updatePeriod);
router.delete('/:id', removePeriod);

module.exports = router;
