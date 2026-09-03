const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getCurrentMuhasabah,
  saveMuhasabah,
  getMuhasabahHistory,
  deleteMuhasabah,
} = require('../controllers/muhasabahController');

router.use(authenticate);

router.get('/history', getMuhasabahHistory);
router.get('/', getCurrentMuhasabah);
router.put('/', saveMuhasabah);
router.delete('/:id', deleteMuhasabah);

module.exports = router;
