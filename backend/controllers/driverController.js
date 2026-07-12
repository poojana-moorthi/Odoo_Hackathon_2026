const db = require('../config/db');

exports.getDrivers = async (req, res) => {
  try {
    let { search, status, page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (driver_name LIKE ? OR license_number LIKE ? OR phone_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Get count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY driver_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [drivers] = await db.query(query, params);

    return res.json({
      data: drivers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GetDrivers error:', error);
    return res.status(500).json({ message: 'Server error retrieving drivers.' });
  }
};

exports.getDriverById = async (req, res) => {
  const { id } = req.params;
  try {
    const [drivers] = await db.query('SELECT * FROM drivers WHERE driver_id = ?', [id]);
    if (drivers.length === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }
    return res.json(drivers[0]);
  } catch (error) {
    console.error('GetDriverById error:', error);
    return res.status(500).json({ message: 'Server error retrieving driver.' });
  }
};

exports.createDriver = async (req, res) => {
  const { driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status } = req.body;

  if (!driver_name || !license_number || !license_category || !license_expiry || !phone_number) {
    return res.status(400).json({ message: 'All fields except safety score and status are required.' });
  }

  try {
    // Unique license validation
    const [exists] = await db.query('SELECT driver_id FROM drivers WHERE license_number = ?', [license_number]);
    if (exists.length > 0) {
      return res.status(400).json({ message: `License number '${license_number}' is already registered.` });
    }

    const driverStatus = status || 'Available';
    const score = safety_score === undefined ? 100.00 : safety_score;

    const [result] = await db.query(
      `INSERT INTO drivers 
       (driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [driver_name, license_number, license_category, license_expiry, phone_number, score, driverStatus]
    );

    return res.status(201).json({
      message: 'Driver profile created successfully.',
      driverId: result.insertId
    });
  } catch (error) {
    console.error('CreateDriver error:', error);
    return res.status(500).json({ message: 'Server error creating driver profile.' });
  }
};

exports.updateDriver = async (req, res) => {
  const { id } = req.params;
  const { driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status } = req.body;

  if (!driver_name || !license_number || !license_category || !license_expiry || !phone_number || safety_score === undefined || !status) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Unique license validation (exclude current driver)
    const [exists] = await db.query('SELECT driver_id FROM drivers WHERE license_number = ? AND driver_id != ?', [license_number, id]);
    if (exists.length > 0) {
      return res.status(400).json({ message: `License number '${license_number}' is already taken by another driver.` });
    }

    const [result] = await db.query(
      `UPDATE drivers 
       SET driver_name = ?, license_number = ?, license_category = ?, license_expiry = ?, phone_number = ?, safety_score = ?, status = ? 
       WHERE driver_id = ?`,
      [driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    return res.json({ message: 'Driver profile updated successfully.' });
  } catch (error) {
    console.error('UpdateDriver error:', error);
    return res.status(500).json({ message: 'Server error updating driver profile.' });
  }
};

exports.deleteDriver = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if driver has trips
    const [trips] = await db.query('SELECT trip_id FROM trips WHERE driver_id = ? LIMIT 1', [id]);
    if (trips.length > 0) {
      return res.status(400).json({ message: 'Cannot delete driver because they are linked to dispatch trips.' });
    }

    const [result] = await db.query('DELETE FROM drivers WHERE driver_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Driver not found.' });
    }
    return res.json({ message: 'Driver deleted successfully.' });
  } catch (error) {
    console.error('DeleteDriver error:', error);
    return res.status(500).json({ message: 'Server error deleting driver.' });
  }
};
