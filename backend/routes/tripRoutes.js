const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// All authenticated users can view trips (reports/dashboards need this)
router.get('/', verifyToken, tripController.getTrips);
router.get('/:id', verifyToken, tripController.getTripById);

// Only Fleet Managers (1) and Drivers (2) can manage trips (dispatch, cancel, complete)
router.post('/', verifyToken, authorize([1, 2]), tripController.createTrip);
router.put('/:id', verifyToken, authorize([1, 2]), tripController.updateTripStatus);
router.delete('/:id', verifyToken, authorize([1, 2]), tripController.deleteTrip);

module.exports = router;
