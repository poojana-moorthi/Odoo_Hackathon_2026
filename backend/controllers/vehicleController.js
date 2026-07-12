const db = require('../config/db');

exports.getVehicles = async (req, res) => {
  try {
    let { search, type, status, page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (registration_number LIKE ? OR vehicle_name LIKE ? OR model LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (type) {
      query += ' AND vehicle_type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY vehicle_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [vehicles] = await db.query(query, params);

    return res.json({
      data: vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GetVehicles error:', error);
    return res.status(500).json({ message: 'Server error retrieving vehicles.' });
  }
};

exports.getVehicleById = async (req, res) => {
  const { id } = req.params;
  try {
    const [vehicles] = await db.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [id]);
    if (vehicles.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json(vehicles[0]);
  } catch (error) {
    console.error('GetVehicleById error:', error);
    return res.status(500).json({ message: 'Server error retrieving vehicle.' });
  }
};

exports.createVehicle = async (req, res) => {
  const { registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status } = req.body;

  // Basic validations
  if (!registration_number || !vehicle_name || !model || !vehicle_type || !maximum_load_capacity || current_odometer === undefined || !purchase_cost) {
    return res.status(400).json({ message: 'All fields except status are required.' });
  }

  try {
    // Uniqueness validation
    const [exists] = await db.query('SELECT vehicle_id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (exists.length > 0) {
      return res.status(400).json({ message: `Registration number '${registration_number}' is already registered.` });
    }

    const vehicleStatus = status || 'Available';

    const [result] = await db.query(
      `INSERT INTO vehicles 
       (registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, vehicleStatus]
    );

    return res.status(201).json({
      message: 'Vehicle added successfully.',
      vehicleId: result.insertId
    });
  } catch (error) {
    console.error('CreateVehicle error:', error);
    return res.status(500).json({ message: 'Server error adding vehicle.' });
  }
};

exports.updateVehicle = async (req, res) => {
  const { id } = req.params;
  const { registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status } = req.body;

  if (!registration_number || !vehicle_name || !model || !vehicle_type || !maximum_load_capacity || current_odometer === undefined || !purchase_cost || !status) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Uniqueness validation (exclude current vehicle)
    const [exists] = await db.query('SELECT vehicle_id FROM vehicles WHERE registration_number = ? AND vehicle_id != ?', [registration_number, id]);
    if (exists.length > 0) {
      return res.status(400).json({ message: `Registration number '${registration_number}' is already taken.` });
    }

    const [result] = await db.query(
      `UPDATE vehicles 
       SET registration_number = ?, vehicle_name = ?, model = ?, vehicle_type = ?, maximum_load_capacity = ?, current_odometer = ?, purchase_cost = ?, status = ? 
       WHERE vehicle_id = ?`,
      [registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    return res.json({ message: 'Vehicle updated successfully.' });
  } catch (error) {
    console.error('UpdateVehicle error:', error);
    return res.status(500).json({ message: 'Server error updating vehicle.' });
  }
};

exports.deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if vehicle has dependent trips or other links
    const [trips] = await db.query('SELECT trip_id FROM trips WHERE vehicle_id = ? LIMIT 1', [id]);
    if (trips.length > 0) {
      return res.status(400).json({ message: 'Cannot delete vehicle because it is linked to dispatch trips.' });
    }

    const [result] = await db.query('DELETE FROM vehicles WHERE vehicle_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('DeleteVehicle error:', error);
    return res.status(500).json({ message: 'Server error deleting vehicle.' });
  }
};
