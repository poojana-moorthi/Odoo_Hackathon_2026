const db = require('../config/db');

exports.getFuelLogs = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT f.*, v.vehicle_name, v.registration_number
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.vehicle_id
      ORDER BY f.date DESC, f.fuel_log_id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM fuel_logs';
    const [countResult] = await db.query(countQuery);
    const total = countResult[0].total;

    const [logs] = await db.query(query, [limit, offset]);

    return res.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GetFuelLogs error:', error);
    return res.status(500).json({ message: 'Server error retrieving fuel logs.' });
  }
};

exports.createFuelLog = async (req, res) => {
  const { vehicle_id, date, fuel_liters, fuel_cost, odometer } = req.body;

  if (!vehicle_id || !date || !fuel_liters || !fuel_cost || odometer === undefined) {
    return res.status(400).json({ message: 'All fuel log parameters are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO fuel_logs (vehicle_id, date, fuel_liters, fuel_cost, odometer) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, date, fuel_liters, fuel_cost, odometer]
    );

    // Update odometer if it is higher than the current vehicle odometer
    await db.query(
      'UPDATE vehicles SET current_odometer = GREATEST(current_odometer, ?) WHERE vehicle_id = ?',
      [odometer, vehicle_id]
    );

    return res.status(201).json({
      message: 'Fuel log added successfully.',
      fuelLogId: result.insertId
    });
  } catch (error) {
    console.error('CreateFuelLog error:', error);
    return res.status(500).json({ message: 'Server error creating fuel log.' });
  }
};

exports.deleteFuelLog = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM fuel_logs WHERE fuel_log_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Fuel log not found.' });
    }
    return res.json({ message: 'Fuel log deleted successfully.' });
  } catch (error) {
    console.error('DeleteFuelLog error:', error);
    return res.status(500).json({ message: 'Server error deleting fuel log.' });
  }
};
