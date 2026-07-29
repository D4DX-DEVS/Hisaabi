const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getMemorizedDuas, addMemorizedDua, removeMemorizedDua, resetMemorization, getDuaCatalogue,
} = require('../controllers/duaController');

router.use(authenticate);
router.get('/catalogue', getDuaCatalogue);
router.get('/memorization', getMemorizedDuas);
router.post('/memorization', addMemorizedDua);
// Reset must come before :dua_id to avoid route conflict
router.post('/memorization/reset', resetMemorization);
router.delete('/memorization/:dua_id', removeMemorizedDua);

module.exports = router;
