const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All authenticated roles (including Driver) can read basic dashboard KPI aggregates
router.get('/dashboard', verifyToken, reportController.getDashboardStats);

// Detailed reports and analytics are restricted to Fleet Manager (1), Safety Officer (3), and Financial Analyst (4)
router.get('/reports', verifyToken, authorize([1, 3, 4]), reportController.getAnalytics);

module.exports = router;
