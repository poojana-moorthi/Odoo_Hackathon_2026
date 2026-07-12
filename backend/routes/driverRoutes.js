const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All authenticated users can view drivers
router.get('/', verifyToken, driverController.getDrivers);
router.get('/:id', verifyToken, driverController.getDriverById);

// Only Fleet Managers (1) and Safety Officers (3) can write driver profiles
router.post('/', verifyToken, authorize([1, 3]), driverController.createDriver);
router.put('/:id', verifyToken, authorize([1, 3]), driverController.updateDriver);
router.delete('/:id', verifyToken, authorize([1, 3]), driverController.deleteDriver);

module.exports = router;
