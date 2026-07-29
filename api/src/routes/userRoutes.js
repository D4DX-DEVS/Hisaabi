const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getProfile, updateProfile, getSettings, updateSettings, removeSettingsKeys, deleteUser,
} = require('../controllers/userController');

router.use(authenticate);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.delete('/settings', removeSettingsKeys);
router.delete('/account', deleteUser);

module.exports = router;
