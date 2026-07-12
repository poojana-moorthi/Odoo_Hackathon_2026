const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.get('/', verifyToken, expenseController.getExpenses);

// Only Fleet Managers (1) and Financial Analysts (4) can log or delete expenses
router.post('/', verifyToken, authorize([1, 4]), expenseController.createExpense);
router.delete('/:id', verifyToken, authorize([1, 4]), expenseController.deleteExpense);

module.exports = router;