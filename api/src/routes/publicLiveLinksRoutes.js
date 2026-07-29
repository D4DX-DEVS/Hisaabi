const express = require('express');
const router = express.Router();
const { getLiveLinks, getLiveLinkById } = require('../controllers/contentController');

// Completely public — no authentication required
router.get('/', getLiveLinks);
router.get('/:id', getLiveLinkById);

module.exports = router;
