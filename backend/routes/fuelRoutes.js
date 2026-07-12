const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', verifyToken, fuelController.getFuelLogs);

// Only Fleet Managers (1) and Financial Analysts (4) can create or delete fuel logs
router.post('/', verifyToken, authorize([1, 4]), fuelController.createFuelLog);
router.delete('/:id', verifyToken, authorize([1, 4]), fuelController.deleteFuelLog);

module.exports = router;
