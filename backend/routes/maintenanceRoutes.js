const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', verifyToken, maintenanceController.getMaintenanceLogs);

// Only Fleet Managers (1) can add, edit, or delete maintenance records
router.post('/', verifyToken, authorize([1]), maintenanceController.createMaintenanceLog);
router.put('/:id', verifyToken, authorize([1]), maintenanceController.updateMaintenanceLog);
router.delete('/:id', verifyToken, authorize([1]), maintenanceController.deleteMaintenanceLog);

module.exports = router;
