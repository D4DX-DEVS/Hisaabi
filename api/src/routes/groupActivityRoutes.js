const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createGroupActivity,
  getGroupActivities,
  reorderGroupActivities,
  updateMyActivityStatus,
  remindPendingMembers,
  editGroupActivity,
  deleteGroupActivity,
  exportGroupActivities,
} = require('../controllers/groupActivityController');

router.use(authenticate);
router.post('/', createGroupActivity);
router.get('/:groupId', getGroupActivities);
router.get('/:groupId/export', exportGroupActivities);
router.put('/:groupId/order', reorderGroupActivities);
router.patch('/:activityId/status', updateMyActivityStatus);
router.post('/:activityId/remind', remindPendingMembers);
router.put('/:activityId', editGroupActivity);
router.delete('/:activityId', deleteGroupActivity);

module.exports = router;
