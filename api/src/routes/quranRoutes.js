const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getReadingProgress,
  addReadPage,
  removeReadPage,
  handleReadingProgress,
  getMemorization,
  addMemorizedAyah,
  removeMemorizedAyah,
  setNextAyahToMemorize,
  resetMemorization,
} = require('../controllers/quranController');

router.use(authenticate);

// Reading
router.get('/reading', getReadingProgress);
router.post('/reading', addReadPage);
// POST /reading/progress must come before DELETE /reading/:page to avoid conflict
router.post('/reading/progress', handleReadingProgress);
router.delete('/reading/:page', removeReadPage);

// Memorization — specific paths before parameterized
router.get('/memorization', getMemorization);
router.post('/memorization/memorized', addMemorizedAyah);
router.post('/memorization/next-ayah', setNextAyahToMemorize);
router.post('/memorization/reset', resetMemorization);
router.delete('/memorization/:ayah_key', removeMemorizedAyah);

module.exports = router;
