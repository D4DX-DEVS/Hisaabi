const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getAdhkar,
  updateAdhkar,
  updatePersonalDhikr,
  deletePersonalDhikr,
  getDuaTracking,
  updateDuaTracking,
} = require('../controllers/adhkarController');

router.use(authenticate);

router.get('/duas', getDuaTracking);
router.put('/duas', updateDuaTracking);
router.put('/personal', updatePersonalDhikr);
router.delete('/personal/:key', deletePersonalDhikr);
router.get('/', getAdhkar);
router.put('/', updateAdhkar);

module.exports = router;
