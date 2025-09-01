const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

router.get('/lead-performance', verifyToken, analyticsController.getLeadPerformance);
router.get('/employee-performance', verifyToken, isAdmin, analyticsController.getEmployeePerformance);
router.get('/task-analytics', verifyToken, analyticsController.getTaskAnalytics);
router.get('/lead-sources', verifyToken, analyticsController.getLeadSources);
router.get('/dashboard-summary', verifyToken, analyticsController.getDashboardSummary);
router.get('/lead-funnel', verifyToken, analyticsController.getLeadFunnel);
router.get('/lead-quality', verifyToken, analyticsController.getLeadQuality);
router.get('/missed-leads', verifyToken, analyticsController.getMissedLeads);

module.exports = router;