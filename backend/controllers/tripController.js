const db = require('../config/db');

exports.getTrips = async (req, res) => {
  try {
    let { search, status, page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, 
             v.vehicle_name, v.registration_number, v.maximum_load_capacity,
             d.driver_name, d.license_number, d.license_expiry
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      JOIN drivers d ON t.driver_id = d.driver_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (t.source LIKE ? OR t.destination LIKE ? OR v.vehicle_name LIKE ? OR d.driver_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    // Get count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      JOIN drivers d ON t.driver_id = d.driver_id
      WHERE 1=1
      ${search ? ' AND (t.source LIKE ? OR t.destination LIKE ? OR v.vehicle_name LIKE ? OR d.driver_name LIKE ?)' : ''}
      ${status ? ' AND t.status = ?' : ''}
    `;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY t.trip_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [trips] = await db.query(query, params);

    return res.json({
      data: trips,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GetTrips error:', error);
    return res.status(500).json({ message: 'Server error retrieving trips.' });
  }
};

exports.getTripById = async (req, res) => {
  const { id } = req.params;
  try {
    const [trips] = await db.query(
      `SELECT t.*, 
              v.vehicle_name, v.registration_number, v.maximum_load_capacity,
              d.driver_name, d.license_number, d.license_expiry
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id
       JOIN drivers d ON t.driver_id = d.driver_id
       WHERE t.trip_id = ?`,
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Get trip history
    const [history] = await db.query(
      'SELECT * FROM trip_history WHERE trip_id = ? ORDER BY status_change_date DESC',
      [id]
    );

    const trip = trips[0];
    trip.history = history;

    return res.json(trip);
  } catch (error) {
    console.error('GetTripById error:', error);
    return res.status(500).json({ message: 'Server error retrieving trip details.' });
  }
};

exports.createTrip = async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status } = req.body;

  if (!source || !destination || !vehicle_id || !driver_id || !cargo_weight || !planned_distance) {
    return res.status(400).json({ message: 'All dispatch parameters are required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Fetch vehicle & check dispatch constraints
    const [vehicles] = await connection.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicle_id]);
    if (vehicles.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Selected vehicle not found.' });
    }
    const vehicle = vehicles[0];

    // 2. Fetch driver & check dispatch constraints
    const [drivers] = await connection.query('SELECT * FROM drivers WHERE driver_id = ?', [driver_id]);
    if (drivers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Selected driver not found.' });
    }
    const driver = drivers[0];

    const tripStatus = status || 'Draft';

    // If dispatching immediately, check active rules
    if (tripStatus === 'Dispatched') {
      if (vehicle.status !== 'Available') {
        await connection.rollback();
        return res.status(400).json({ message: `Vehicle is currently not available (Current status: ${vehicle.status}).` });
      }

      if (vehicle.status === 'Retired') {
        await connection.rollback();
        return res.status(400).json({ message: 'Retired vehicles cannot be dispatched.' });
      }

      if (vehicle.status === 'In Shop') {
        await connection.rollback();
        return res.status(400).json({ message: 'Vehicles currently in maintenance shop cannot be dispatched.' });
      }

      if (driver.status !== 'Available') {
        await connection.rollback();
        return res.status(400).json({ message: `Driver is currently not available (Current status: ${driver.status}).` });
      }

      if (driver.status === 'Suspended') {
        await connection.rollback();
        return res.status(400).json({ message: 'Suspended drivers cannot be dispatched.' });
      }

      // Check expired license
      const licenseExpiryDate = new Date(driver.license_expiry);
      const today = new Date();
      if (licenseExpiryDate < today) {
        await connection.rollback();
        return res.status(400).json({ message: `Driver license is expired (Expiry date: ${driver.license_expiry}). Cannot dispatch.` });
      }
    }

    // Cargo weight validation
    const maxSingleWeight = 500;
    const initialWeight = parseFloat(cargo_weight);
    
    if (initialWeight > maxSingleWeight) {
      if (maxSingleWeight > parseFloat(vehicle.maximum_load_capacity)) {
        await connection.rollback();
        return res.status(400).json({
          message: `Selected vehicle maximum capacity (${vehicle.maximum_load_capacity} kg) is less than the 500 kg split limit.`
        });
      }
    } else {
      if (initialWeight > parseFloat(vehicle.maximum_load_capacity)) {
        await connection.rollback();
        return res.status(400).json({
          message: `Cargo weight (${cargo_weight} kg) exceeds vehicle maximum capacity (${vehicle.maximum_load_capacity} kg).`
        });
      }
    }

    const dispatchDate = tripStatus === 'Dispatched' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    const firstTripWeight = initialWeight > maxSingleWeight ? maxSingleWeight : initialWeight;

    // Create the first trip
    const [result] = await connection.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, dispatch_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [source, destination, vehicle_id, driver_id, firstTripWeight, planned_distance, tripStatus, dispatchDate]
    );

    const tripId = result.insertId;

    // Write to history
    await connection.query(
      'INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?)',
      [tripId, 'Draft', 'Trip created in draft mode.']
    );

    if (tripStatus === 'Dispatched') {
      await connection.query(
        'INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?)',
        [tripId, 'Dispatched', 'Trip dispatched. Resources status updated to On Trip.']
      );

      // Update vehicle & driver status
      await connection.query('UPDATE vehicles SET status = "On Trip" WHERE vehicle_id = ?', [vehicle_id]);
      await connection.query('UPDATE drivers SET status = "On Trip" WHERE driver_id = ?', [driver_id]);
    }

    // Dispatch extra cargo if greater than 500 kg
    if (initialWeight > maxSingleWeight) {
      let remainingCargo = initialWeight - maxSingleWeight;
      const assignedVehicleIds = [parseInt(vehicle_id)];
      const assignedDriverIds = [parseInt(driver_id)];

      while (remainingCargo > 0) {
        const chunk = Math.min(remainingCargo, maxSingleWeight);

        // Find next available vehicle
        const [availVehicles] = await connection.query(
          `SELECT * FROM vehicles 
           WHERE status = 'Available' AND maximum_load_capacity >= ? AND vehicle_id NOT IN (?) 
           ORDER BY maximum_load_capacity ASC LIMIT 1`,
          [chunk, assignedVehicleIds]
        );

        // Find next available driver with valid license
        const [availDrivers] = await connection.query(
          `SELECT * FROM drivers 
           WHERE status = 'Available' AND license_expiry >= CURDATE() AND driver_id NOT IN (?)
           ORDER BY safety_score DESC LIMIT 1`,
          [assignedDriverIds]
        );

        if (availVehicles.length === 0 || availDrivers.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            message: `Could not dispatch extra cargo: lack of available vehicles/drivers to support splitting remaining ${remainingCargo.toFixed(1)} kg.`
          });
        }

        const nextVehicle = availVehicles[0];
        const nextDriver = availDrivers[0];

        assignedVehicleIds.push(nextVehicle.vehicle_id);
        assignedDriverIds.push(nextDriver.driver_id);

        // Create the extra trip
        const [extraResult] = await connection.query(
          `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, dispatch_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [source, destination, nextVehicle.vehicle_id, nextDriver.driver_id, chunk, planned_distance, tripStatus, dispatchDate]
        );

        const extraTripId = extraResult.insertId;

        // Write to history
        await connection.query(
          'INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?)',
          [extraTripId, 'Draft', 'Trip created automatically for split extra cargo.']
        );

        if (tripStatus === 'Dispatched') {
          await connection.query(
            'INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?)',
            [extraTripId, 'Dispatched', 'Trip dispatched automatically for split extra cargo.']
          );

          // Update vehicle & driver status
          await connection.query('UPDATE vehicles SET status = "On Trip" WHERE vehicle_id = ?', [nextVehicle.vehicle_id]);
          await connection.query('UPDATE drivers SET status = "On Trip" WHERE driver_id = ?', [nextDriver.driver_id]);
        }

        remainingCargo -= chunk;
      }
    }

    await connection.commit();
    return res.status(201).json({
      message: `Trip created successfully ${tripStatus === 'Dispatched' ? 'and dispatched' : 'as draft'}.`,
      tripId
    });
  } catch (error) {
    await connection.rollback();
    console.error('CreateTrip error:', error);
    return res.status(500).json({ message: 'Server error dispatching trip.' });
  } finally {
    connection.release();
  }
};

exports.updateTripStatus = async (req, res) => {
  const { id } = req.params;
  const { status, actual_distance, fuel_used, notes } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Fetch trip
    const [trips] = await connection.query('SELECT * FROM trips WHERE trip_id = ?', [id]);
    if (trips.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Trip not found.' });
    }
    const trip = trips[0];

    // If status remains unchanged, return early
    if (trip.status === status) {
      await connection.rollback();
      return res.json({ message: 'Trip is already in this status.' });
    }

    const { vehicle_id, driver_id } = trip;

    // Handle transitions
    if (status === 'Dispatched') {
      // Must check vehicle & driver availability
      const [vehicles] = await connection.query('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicle_id]);
      const vehicle = vehicles[0];

      const [drivers] = await connection.query('SELECT * FROM drivers WHERE driver_id = ?', [driver_id]);
      const driver = drivers[0];

      if (vehicle.status !== 'Available') {
        await connection.rollback();
        return res.status(400).json({ message: `Vehicle is currently not available (Current status: ${vehicle.status}).` });
      }
      if (driver.status !== 'Available') {
        await connection.rollback();
        return res.status(400).json({ message: `Driver is currently not available (Current status: ${driver.status}).` });
      }

      // Check expired license
      if (new Date(driver.license_expiry) < new Date()) {
        await connection.rollback();
        return res.status(400).json({ message: `Driver license is expired. Cannot dispatch.` });
      }

      const dispatchDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.query('UPDATE trips SET status = "Dispatched", dispatch_date = ? WHERE trip_id = ?', [dispatchDate, id]);
      await connection.query('UPDATE vehicles SET status = "On Trip" WHERE vehicle_id = ?', [vehicle_id]);
      await connection.query('UPDATE drivers SET status = "On Trip" WHERE driver_id = ?', [driver_id]);

    } else if (status === 'Completed') {
      if (!actual_distance || !fuel_used) {
        await connection.rollback();
        return res.status(400).json({ message: 'Actual distance and fuel used are required to complete a trip.' });
      }

      const completionDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.query(
        'UPDATE trips SET status = "Completed", actual_distance = ?, fuel_used = ?, completion_date = ? WHERE trip_id = ?',
        [actual_distance, fuel_used, completionDate, id]
      );

      // Restore vehicle and driver to Available
      await connection.query('UPDATE vehicles SET status = "Available", current_odometer = current_odometer + ? WHERE vehicle_id = ?', [actual_distance, vehicle_id]);
      await connection.query('UPDATE drivers SET status = "Available" WHERE driver_id = ?', [driver_id]);

      // Automatically add a Fuel Log for reports tracking
      await connection.query(
        'INSERT INTO fuel_logs (vehicle_id, date, fuel_liters, fuel_cost, odometer) VALUES (?, ?, ?, ?, (SELECT current_odometer FROM vehicles WHERE vehicle_id = ?))',
        [vehicle_id, completionDate.slice(0, 10), fuel_used, fuel_used * 1.45, vehicle_id]
      );

    } else if (status === 'Cancelled') {
      await connection.query('UPDATE trips SET status = "Cancelled" WHERE trip_id = ?', [id]);

      // Restore both resources to Available only if they were On Trip for this dispatch
      if (trip.status === 'Dispatched') {
        await connection.query('UPDATE vehicles SET status = "Available" WHERE vehicle_id = ?', [vehicle_id]);
        await connection.query('UPDATE drivers SET status = "Available" WHERE driver_id = ?', [driver_id]);
      }
    }

    // Insert history log
    const logNotes = notes || `Trip status updated to ${status}.`;
    await connection.query(
      'INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?)',
      [id, status, logNotes]
    );

    // Add a system notification
    await connection.query(
      'INSERT INTO notifications (message) VALUES (?)',
      [`Trip ID ${id} was marked as ${status}.`]
    );

    await connection.commit();
    return res.json({ message: `Trip status updated to ${status} successfully.` });

  } catch (error) {
    await connection.rollback();
    console.error('UpdateTripStatus error:', error);
    return res.status(500).json({ message: 'Server error updating trip status.' });
  } finally {
    connection.release();
  }
};

exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const [trips] = await db.query('SELECT status FROM trips WHERE trip_id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const { status } = trips[0];
    if (status === 'Dispatched') {
      return res.status(400).json({ message: 'Cannot delete an active dispatched trip.' });
    }

    await db.query('DELETE FROM trips WHERE trip_id = ?', [id]);
    return res.json({ message: 'Trip deleted successfully.' });
  } catch (error) {
    console.error('DeleteTrip error:', error);
    return res.status(500).json({ message: 'Server error deleting trip.' });
  }
};
