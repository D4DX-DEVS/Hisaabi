const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createGroup, joinGroupByCode, getMyGroups, leaveGroup, getGroupMembers, deleteGroup, transferAdmin, removeMember, revokeAdmin,
} = require('../controllers/groupController');

router.use(authenticate);
router.post('/', createGroup);
router.post('/join', joinGroupByCode);
router.get('/my', getMyGroups);
router.post('/leave', leaveGroup);
router.get('/members/:group_id', getGroupMembers);
router.patch('/:group_id/transfer-admin', transferAdmin);
router.patch('/:group_id/revoke-admin', revokeAdmin);
router.delete('/:group_id/members/:user_id', removeMember);
router.delete('/:group_id', deleteGroup);

module.exports = router;
