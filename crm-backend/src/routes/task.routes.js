const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Get all tasks (filtered for employees)
router.get('/', verifyToken, taskController.getTasks);

// Create new task (admin only)
router.post('/', verifyToken, taskController.createTask);

// Get specific task
router.get('/:id', verifyToken, taskController.getTaskById);

// Update task status
router.put('/:id/status', verifyToken, taskController.updateTaskStatus);

// Update task
router.put('/:id', verifyToken, taskController.updateTask);

// Delete task
router.delete('/:id', verifyToken, taskController.deleteTask);

// Add comment to task
router.post('/:id/comments', verifyToken, taskController.addComment);

module.exports = router;