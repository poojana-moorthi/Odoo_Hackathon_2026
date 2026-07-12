const db = require('../config/db');

exports.getExpenses = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT e.*, v.vehicle_name, v.registration_number
      FROM expenses e
      JOIN vehicles v ON e.vehicle_id = v.vehicle_id
      ORDER BY e.date DESC, e.expense_id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM expenses';
    const [countResult] = await db.query(countQuery);
    const total = countResult[0].total;

    const [expenses] = await db.query(query, [limit, offset]);

    return res.json({
      data: expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GetExpenses error:', error);
    return res.status(500).json({ message: 'Server error retrieving expenses.' });
  }
};

exports.createExpense = async (req, res) => {
  const { vehicle_id, expense_type, cost, description, date } = req.body;

  if (!vehicle_id || !expense_type || !cost || !date) {
    return res.status(400).json({ message: 'All fields except description are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO expenses (vehicle_id, expense_type, cost, description, date) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, expense_type, cost, description, date]
    );

    return res.status(201).json({
      message: 'Expense record logged successfully.',
      expenseId: result.insertId
    });
  } catch (error) {
    console.error('CreateExpense error:', error);
    return res.status(500).json({ message: 'Server error creating expense record.' });
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM expenses WHERE expense_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense record not found.' });
    }
    return res.json({ message: 'Expense record deleted successfully.' });
  } catch (error) {
    console.error('DeleteExpense error:', error);
    return res.status(500).json({ message: 'Server error deleting expense record.' });
  }
};
