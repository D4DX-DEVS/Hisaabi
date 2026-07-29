const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDhikrTracking, updateDhikrCount, getDhikrTypeCatalogue } = require('../controllers/dhikrController');

router.use(authenticate);
router.get('/types', getDhikrTypeCatalogue);
router.get('/', getDhikrTracking);
router.post('/', updateDhikrCount);

module.exports = router;
