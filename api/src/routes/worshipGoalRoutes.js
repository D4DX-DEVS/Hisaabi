const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  listGoals,
  createGoal,
  updateGoal,
  incrementGoal,
  deleteGoal,
  shareGoal,
} = require('../controllers/worshipGoalController');

router.use(authenticate);

router.get('/', listGoals);
router.post('/', createGoal);
router.patch('/:id/increment', incrementGoal);
router.patch('/:id/share', shareGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
