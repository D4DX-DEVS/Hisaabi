const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getCatalog,
  addCustomDeed,
  deleteCustomDeed,
  getDeeds,
  logDeed,
  deleteDeed,
} = require('../controllers/goodDeedController');

router.use(authenticate);

router.get('/catalog', getCatalog);
router.post('/catalog', addCustomDeed);
router.delete('/catalog/:key', deleteCustomDeed);
router.get('/', getDeeds);
router.post('/', logDeed);
router.delete('/:id', deleteDeed);

module.exports = router;
