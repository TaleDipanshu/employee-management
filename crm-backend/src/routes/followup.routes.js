const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followup.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Get all follow-ups with filters
router.get('/', verifyToken, followupController.getFollowUps);

// Get follow-ups by employee ID
router.get('/employee/:employeeId', verifyToken, followupController.getFollowUpsByEmployee);

// Get follow-up statistics
router.get('/stats', verifyToken, followupController.getFollowUpStats);

// Create new follow-up
router.post('/', verifyToken, followupController.createFollowUp);

// Get specific follow-up
router.get('/:id', verifyToken, followupController.getFollowUpById);

// Update follow-up status
router.put('/:id/status', verifyToken, followupController.updateFollowUpStatus);

// Update follow-up
router.put('/:id', verifyToken, followupController.updateFollowUp);

// Delete follow-up
router.delete('/:id', verifyToken, followupController.deleteFollowUp);

// Add a route for follow-up counts by status
router.get('/counts', verifyToken, followupController.getFollowUpCounts);

module.exports = router;