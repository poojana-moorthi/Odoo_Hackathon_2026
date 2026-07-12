const db = require('../config/db');

exports.getMaintenanceLogs = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT m.*, v.vehicle_name, v.registration_number, v.status as vehicle_status
      FROM maintenance_logs m
      JOIN vehicles v ON m.vehicle_id = v.vehicle_id
      ORDER BY m.maintenance_id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM maintenance_logs';

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
    console.error('GetMaintenanceLogs error:', error);
    return res.status(500).json({ message: 'Server error retrieving maintenance logs.' });
  }
};

exports.createMaintenanceLog = async (req, res) => {
  const { vehicle_id, issue, maintenance_type, start_date, expected_completion, status } = req.body;

  if (!vehicle_id || !issue || !maintenance_type || !start_date || !expected_completion) {
    return res.status(400).json({ message: 'All maintenance details are required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const logStatus = status || 'In Shop';

    // Insert log
    const [result] = await connection.query(
      `INSERT INTO maintenance_logs (vehicle_id, issue, maintenance_type, start_date, expected_completion, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vehicle_id, issue, maintenance_type, start_date, expected_completion, logStatus]
    );

    // If starting maintenance (In Shop), change vehicle status
    if (logStatus === 'In Shop') {
      await connection.query(
        'UPDATE vehicles SET status = "In Shop" WHERE vehicle_id = ?',
        [vehicle_id]
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: 'Maintenance record created successfully.',
      maintenanceId: result.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('CreateMaintenanceLog error:', error);
    return res.status(500).json({ message: 'Server error creating maintenance record.' });
  } finally {
    connection.release();
  }
};

exports.updateMaintenanceLog = async (req, res) => {
  const { id } = req.params;
  const { issue, maintenance_type, start_date, expected_completion, status } = req.body;

  if (!issue || !maintenance_type || !start_date || !expected_completion || !status) {
    return res.status(400).json({ message: 'All maintenance details are required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Get existing log
    const [logs] = await connection.query('SELECT * FROM maintenance_logs WHERE maintenance_id = ?', [id]);
    if (logs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Maintenance record not found.' });
    }
    const log = logs[0];
    const { vehicle_id } = log;

    // Update log details
    await connection.query(
      `UPDATE maintenance_logs 
       SET issue = ?, maintenance_type = ?, start_date = ?, expected_completion = ?, status = ? 
       WHERE maintenance_id = ?`,
      [issue, maintenance_type, start_date, expected_completion, status, id]
    );

    // Check transition
    if (log.status === 'In Shop' && status === 'Completed') {
      // Vehicle becomes Available unless it was set to Retired in the meantime
      const [vehicles] = await connection.query('SELECT status FROM vehicles WHERE vehicle_id = ?', [vehicle_id]);
      if (vehicles.length > 0) {
        const vehicle = vehicles[0];
        if (vehicle.status !== 'Retired') {
          await connection.query(
            'UPDATE vehicles SET status = "Available" WHERE vehicle_id = ?',
            [vehicle_id]
          );
        }
      }
    } else if (log.status === 'Completed' && status === 'In Shop') {
      // Re-opened / set back to in-shop
      await connection.query(
        'UPDATE vehicles SET status = "In Shop" WHERE vehicle_id = ?',
        [vehicle_id]
      );
    }

    await connection.commit();
    return res.json({ message: 'Maintenance record updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('UpdateMaintenanceLog error:', error);
    return res.status(500).json({ message: 'Server error updating maintenance record.' });
  } finally {
    connection.release();
  }
};

exports.deleteMaintenanceLog = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM maintenance_logs WHERE maintenance_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Maintenance record not found.' });
    }
    return res.json({ message: 'Maintenance record deleted successfully.' });
  } catch (error) {
    console.error('DeleteMaintenanceLog error:', error);
    return res.status(500).json({ message: 'Server error deleting maintenance record.' });
  }
};
