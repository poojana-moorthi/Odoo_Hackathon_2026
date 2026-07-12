const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All authenticated users can view vehicles (needed for trips, fuel logs, etc.)
router.get('/', verifyToken, vehicleController.getVehicles);
router.get('/:id', verifyToken, vehicleController.getVehicleById);

// Only Fleet Managers can create, update, or delete vehicles
router.post('/', verifyToken, authorize([1]), vehicleController.createVehicle);
router.put('/:id', verifyToken, authorize([1]), vehicleController.updateVehicle);
router.delete('/:id', verifyToken, authorize([1]), vehicleController.deleteVehicle);

module.exports = router;
