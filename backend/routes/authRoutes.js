const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.checkAuth);
router.post('/change-password', verifyToken, authController.changePassword);

// User & Role administration (restricted to Fleet Manager: role_id = 1)
router.get('/users', verifyToken, authorize([1]), authController.getUsers);
router.get('/roles', verifyToken, authorize([1]), authController.getRoles);
router.post('/users', verifyToken, authorize([1]), authController.createUser);
router.put('/users/role', verifyToken, authorize([1]), authController.updateUserRole);

module.exports = router;