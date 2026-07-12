const mysql = require('../backend/node_modules/mysql2/promise');
const bcrypt = require('../backend/node_modules/bcryptjs');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  multipleStatements: true
};

async function seed() {
  console.log('Starting TransitOps Database Seeding...');
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. Run Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('Database schema created successfully.');

    // Use the created database
    await connection.query('USE transitops_db;');

    const sqlStatements = [];
    sqlStatements.push('USE transitops_db;');

    // 2. Hash Password for users
    const pwdHash = await bcrypt.hash('Password123', 10);

    // 3. Seed Roles
    const roles = [
      [1, 'Fleet Manager', 'Full system access, reports, user registry management'],
      [2, 'Driver', 'Can view dashboard and active trip details'],
      [3, 'Safety Officer', 'Manage driver registry and view reports/analytics'],
      [4, 'Financial Analyst', 'Manage fuel logs, expenses, and financial reporting']
    ];
    for (const r of roles) {
      await connection.query('INSERT INTO roles (role_id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=name;', r);
      sqlStatements.push(`INSERT INTO roles (role_id, name, description) VALUES (${r[0]}, '${r[1]}', '${r[2]}') ON DUPLICATE KEY UPDATE name=name;`);
    }
    console.log('Roles seeded.');

    // 4. Seed Users
    const users = [
      ['manager', 'manager@transitops.com', pwdHash, 1, 'Active'],
      ['driver', 'driver@transitops.com', pwdHash, 2, 'Active'],
      ['safety', 'safety@transitops.com', pwdHash, 3, 'Active'],
      ['finance', 'finance@transitops.com', pwdHash, 4, 'Active'],
      ['driver2', 'driver2@transitops.com', pwdHash, 2, 'Active']
    ];
    for (const u of users) {
      await connection.query('INSERT INTO users (username, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?);', u);
      sqlStatements.push(`INSERT INTO users (username, email, password_hash, role_id, status) VALUES ('${u[0]}', '${u[1]}', '${u[2]}', ${u[3]}, '${u[4]}');`);
    }
    console.log('Users seeded.');

    // 5. Seed Vehicles (20)
    const vehicleNames = [
      'Freightliner Cascadia', 'Volvo VNL 860', 'Peterbilt 579', 'Kenworth T680', 'Mack Anthem',
      'Ford Transit 350', 'Chevrolet Express 3500', 'Mercedes Sprinter', 'RAM ProMaster', 'Isuzu NPR',
      'Hino 268', 'International LT', 'Tesla Semi', 'Ford F-550 Flatbed', 'GMC Savana',
      'Scania R500', 'DAF XF', 'Volvo FH16', 'Peterbilt 389', 'Kenworth W900'
    ];
    const vehicleTypes = ['Semi Truck', 'Semi Truck', 'Semi Truck', 'Semi Truck', 'Semi Truck', 'Cargo Van', 'Cargo Van', 'Cargo Van', 'Cargo Van', 'Box Truck', 'Box Truck', 'Semi Truck', 'Semi Truck', 'Flatbed', 'Cargo Van', 'Semi Truck', 'Semi Truck', 'Semi Truck', 'Semi Truck', 'Semi Truck'];
    const capacities = [22000, 21000, 23000, 22000, 20000, 3500, 3200, 4000, 3800, 8000, 9000, 22500, 25000, 9500, 3300, 24000, 23000, 26000, 22000, 21500];

    const vehicleIds = [];
    for (let i = 0; i < 20; i++) {
      const reg = `TX-${1000 + i}-OPS`;
      const name = vehicleNames[i];
      const model = `Model ${2018 + (i % 6)}`;
      const type = vehicleTypes[i];
      const cap = capacities[i];
      const odo = 45000 + (i * 12500);
      const cost = 25000 + (i * 4500);
      // set 14 available, 3 on trip, 2 in shop, 1 retired
      let status = 'Available';
      if (i === 3 || i === 7 || i === 11) status = 'On Trip';
      else if (i === 5 || i === 15) status = 'In Shop';
      else if (i === 19) status = 'Retired';

      const [res] = await connection.query(
        'INSERT INTO vehicles (registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [reg, name, model, type, cap, odo, cost, status]
      );
      vehicleIds.push(res.insertId);
      sqlStatements.push(`INSERT INTO vehicles (vehicle_id, registration_number, vehicle_name, model, vehicle_type, maximum_load_capacity, current_odometer, purchase_cost, status) VALUES (${res.insertId}, '${reg}', '${name}', '${model}', '${type}', ${cap}, ${odo}, ${cost}, '${status}');`);
    }
    console.log('Vehicles seeded.');

    // 6. Seed Drivers (20)
    const driverNames = [
      'John Doe', 'Jane Smith', 'Michael Johnson', 'David Miller', 'James Wilson',
      'Robert Taylor', 'William Thomas', 'Joseph Anderson', 'Richard Jackson', 'Charles White',
      'Thomas Harris', 'Daniel Martin', 'Matthew Thompson', 'Anthony Garcia', 'Mark Martinez',
      'Donald Robinson', 'Steven Clark', 'Paul Rodriguez', 'Andrew Lewis', 'Joshua Lee'
    ];
    const licenseCategories = ['Class A CDL', 'Class A CDL', 'Class A CDL', 'Class A CDL', 'Class B CDL', 'Class C', 'Class C', 'Class C', 'Class C', 'Class B CDL', 'Class B CDL', 'Class A CDL', 'Class A CDL', 'Class B CDL', 'Class C', 'Class A CDL', 'Class A CDL', 'Class A CDL', 'Class A CDL', 'Class A CDL'];

    const driverIds = [];
    for (let i = 0; i < 20; i++) {
      const name = driverNames[i];
      const lic = `DL-OPS${8000 + i}`;
      const cat = licenseCategories[i];
      // driver index 18 is expired license, driver index 19 is suspended driver
      let expiry = '2028-10-15';
      if (i === 18) expiry = '2025-02-10'; // Expired

      const phone = `+1-555-${1000 + i}`;
      const score = 80 + (i % 21); // safety scores between 80 and 100
      let status = 'Available';
      if (i === 3 || i === 7 || i === 11) status = 'On Trip';
      else if (i === 14) status = 'Off Duty';
      else if (i === 19) status = 'Suspended';

      const [res] = await connection.query(
        'INSERT INTO drivers (driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [name, lic, cat, expiry, phone, score, status]
      );
      driverIds.push(res.insertId);
      sqlStatements.push(`INSERT INTO drivers (driver_id, driver_name, license_number, license_category, license_expiry, phone_number, safety_score, status) VALUES (${res.insertId}, '${name}', '${lic}', '${cat}', '${expiry}', '${phone}', ${score}, '${status}');`);
    }
    console.log('Drivers seeded.');

    // 7. Seed Trips (50)
    // 35 Completed, 5 Dispatched, 5 Draft, 5 Cancelled
    const cities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'El Paso', 'Fort Worth', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock', 'Laredo'];
    const tripIds = [];
    for (let i = 0; i < 50; i++) {
      const source = cities[i % cities.length];
      let dest = cities[(i + 3) % cities.length];
      if (source === dest) dest = cities[(i + 1) % cities.length];

      // Match vehicles and drivers
      // For dispatched trips (let's say trip index 40-44), assign On Trip vehicles and drivers
      // Dispatched: vehicle 3, 7, 11 (corresponds to index 3, 7, 11) and driver 3, 7, 11
      let vehicleId = vehicleIds[i % 15]; // use vehicles 0 to 14
      let driverId = driverIds[i % 15];

      let status = 'Completed';
      if (i >= 35 && i < 40) {
        status = 'Draft';
      } else if (i >= 40 && i < 43) {
        status = 'Dispatched';
        // Assign On Trip ones explicitly to match vehicle/driver states
        if (i === 40) { vehicleId = vehicleIds[3]; driverId = driverIds[3]; }
        if (i === 41) { vehicleId = vehicleIds[7]; driverId = driverIds[7]; }
        if (i === 42) { vehicleId = vehicleIds[11]; driverId = driverIds[11]; }
      } else if (i >= 43 && i < 45) {
        status = 'Dispatched';
        // To avoid conflicts, let's keep them matched but we will set their vehicle/driver status in DB
        // Wait, let's just make sure only 5 trips are Dispatched. Index 40, 41, 42 are dispatched with vehicle 3, 7, 11 (which are On Trip).
        // Let's make index 43 and 44 also dispatched but let's change their vehicle and driver status to On Trip in DB.
        // Wait, vehicle 12 and 13, and driver 12 and 13 can be set to On Trip as well!
        // We'll update the vehicles/drivers statuses dynamically.
        vehicleId = vehicleIds[12 + (i - 43)];
        driverId = driverIds[12 + (i - 43)];
        await connection.query('UPDATE vehicles SET status = "On Trip" WHERE vehicle_id = ?;', [vehicleId]);
        await connection.query('UPDATE drivers SET status = "On Trip" WHERE driver_id = ?;', [driverId]);
      } else if (i >= 45) {
        status = 'Cancelled';
      }

      const plannedDist = 150.0 + (i * 8.5);
      const cargo = 1000 + (i * 200);

      let actualDist = null;
      let fuelUsed = null;
      let dispatchDate = null;
      let completionDate = null;

      if (status === 'Completed') {
        actualDist = plannedDist + (Math.random() * 10 - 5);
        fuelUsed = actualDist / (5 + (i % 3)); // 5-7 miles per gallon equivalent
        dispatchDate = new Date();
        dispatchDate.setDate(dispatchDate.getDate() - (55 - i));
        completionDate = new Date(dispatchDate.getTime() + (plannedDist / 50) * 3600000); // 50 mph speed average
      } else if (status === 'Dispatched') {
        dispatchDate = new Date();
        dispatchDate.setHours(dispatchDate.getHours() - 4);
      }

      const dispatchStr = dispatchDate ? dispatchDate.toISOString().slice(0, 19).replace('T', ' ') : null;
      const completeStr = completionDate ? completionDate.toISOString().slice(0, 19).replace('T', ' ') : null;

      const [res] = await connection.query(
        'INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_used, status, dispatch_date, completion_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [source, dest, vehicleId, driverId, cargo, plannedDist, actualDist, fuelUsed, status, dispatchStr, completeStr]
      );
      tripIds.push(res.insertId);
      sqlStatements.push(`INSERT INTO trips (trip_id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_used, status, dispatch_date, completion_date) VALUES (${res.insertId}, '${source}', '${dest}', ${vehicleId}, ${driverId}, ${cargo}, ${plannedDist}, ${actualDist ? actualDist.toFixed(2) : 'NULL'}, ${fuelUsed ? fuelUsed.toFixed(2) : 'NULL'}, '${status}', ${dispatchStr ? `'${dispatchStr}'` : 'NULL'}, ${completeStr ? `'${completeStr}'` : 'NULL'});`);

      // Seed trip history
      await connection.query('INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?);', [res.insertId, 'Draft', 'Trip created in draft mode.']);
      sqlStatements.push(`INSERT INTO trip_history (trip_id, status, notes) VALUES (${res.insertId}, 'Draft', 'Trip created in draft mode.');`);
      if (status !== 'Draft') {
        await connection.query('INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?);', [res.insertId, 'Dispatched', 'Trip dispatched.']);
        sqlStatements.push(`INSERT INTO trip_history (trip_id, status, notes) VALUES (${res.insertId}, 'Dispatched', 'Trip dispatched.');`);
      }
      if (status === 'Completed') {
        await connection.query('INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?);', [res.insertId, 'Completed', 'Trip completed successfully.']);
        sqlStatements.push(`INSERT INTO trip_history (trip_id, status, notes) VALUES (${res.insertId}, 'Completed', 'Trip completed successfully.');`);
      } else if (status === 'Cancelled') {
        await connection.query('INSERT INTO trip_history (trip_id, status, notes) VALUES (?, ?, ?);', [res.insertId, 'Cancelled', 'Trip cancelled.']);
        sqlStatements.push(`INSERT INTO trip_history (trip_id, status, notes) VALUES (${res.insertId}, 'Cancelled', 'Trip cancelled.');`);
      }
    }
    console.log('Trips seeded.');

    // 8. Seed Fuel Logs (30)
    for (let i = 0; i < 30; i++) {
      const vehicleId = vehicleIds[i % 15]; // Use vehicles 0 to 14
      const date = new Date();
      date.setDate(date.getDate() - (35 - i));
      const dateStr = date.toISOString().slice(0, 10);
      const liters = 80.0 + (i * 4.5);
      const cost = liters * 1.45; // average $1.45 per liter fuel cost
      const odometer = 45000 + (i * 850) + (i % 15 * 50);

      await connection.query(
        'INSERT INTO fuel_logs (vehicle_id, date, fuel_liters, fuel_cost, odometer) VALUES (?, ?, ?, ?, ?);',
        [vehicleId, dateStr, liters, cost, odometer]
      );
      sqlStatements.push(`INSERT INTO fuel_logs (vehicle_id, date, fuel_liters, fuel_cost, odometer) VALUES (${vehicleId}, '${dateStr}', ${liters.toFixed(2)}, ${cost.toFixed(2)}, ${odometer});`);
    }
    console.log('Fuel Logs seeded.');

    // 9. Seed Maintenance Records (20)
    // Some completed, some in shop
    const issues = [
      'Engine oil replacement and filter check', 'Brake pad replacement and rotor turn', 'AC cooling system leak repair',
      'Transmission fluid flush and check', 'Tire rotation and balancing', 'Headlight and electrical fuse replacement',
      'Coolant system flush and pressure test', 'Front wheel alignment and strut check', 'Windshield wiper motor replacement',
      'Differential fluid check and top-up', 'Fuel injector cleaning and tune-up', 'Alternator charging system test',
      'Spark plug replacement', 'Muffler and exhaust system repair', 'Suspension bushing replacement',
      'Hydraulic lift inspection', 'Tailgate latch repair', 'Air filter replacement', 'Battery check and replacement',
      'Seat belt safety retractor check'
    ];
    const maintenanceTypes = ['Routine', 'Repair', 'Inspection', 'Emergency', 'Routine', 'Repair', 'Inspection', 'Emergency', 'Repair', 'Routine', 'Routine', 'Repair', 'Routine', 'Repair', 'Repair', 'Inspection', 'Repair', 'Routine', 'Inspection', 'Inspection'];

    for (let i = 0; i < 20; i++) {
      const vehicleId = vehicleIds[i % 20];
      const issue = issues[i];
      const type = maintenanceTypes[i];

      const start = new Date();
      start.setDate(start.getDate() - (25 - i));
      const startStr = start.toISOString().slice(0, 10);

      const expected = new Date(start);
      expected.setDate(expected.getDate() + 2);
      const expectedStr = expected.toISOString().slice(0, 10);

      // Matches the status of vehicles: vehicle index 5 and 15 are In Shop
      let status = 'Completed';
      if (i === 5 || i === 15) {
        status = 'In Shop';
        // Make sure vehicle status matches
        await connection.query('UPDATE vehicles SET status = "In Shop" WHERE vehicle_id = ?;', [vehicleId]);
      }

      await connection.query(
        'INSERT INTO maintenance_logs (vehicle_id, issue, maintenance_type, start_date, expected_completion, status) VALUES (?, ?, ?, ?, ?, ?);',
        [vehicleId, issue, type, startStr, expectedStr, status]
      );
      sqlStatements.push(`INSERT INTO maintenance_logs (vehicle_id, issue, maintenance_type, start_date, expected_completion, status) VALUES (${vehicleId}, '${issue}', '${type}', '${startStr}', '${expectedStr}', '${status}');`);
    }
    console.log('Maintenance Logs seeded.');

    // 10. Seed Expenses (20)
    const expenseTypes = ['Maintenance', 'Repair', 'Toll', 'Insurance', 'Parking', 'Miscellaneous'];
    const descList = [
      'Routine brake service billing', 'Radiator hose replacement', 'Interstate toll highway usage',
      'Commercial vehicle insurance premium', 'Downtown depot parking fees', 'Logbook registration update',
      'Engine oil service charge', 'Tire puncture repair billing', 'Bridge toll payment',
      'Liability insurance monthly payment', 'Overnight cargo parking fees', 'Windshield washer fluid top-up',
      'Tire rotation service billing', 'Alternator replacement labor cost', 'Highway express pass toll',
      'Quarterly cargo insurance payment', 'Fleet garage parking permit', 'Driver convenience allowance',
      'Brake caliper inspection service', 'Coolant leak hose repair'
    ];

    for (let i = 0; i < 20; i++) {
      const vehicleId = vehicleIds[i % 20];
      const type = expenseTypes[i % expenseTypes.length];
      const cost = 25.0 + (i * 45.5);
      const desc = descList[i];
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      const dateStr = date.toISOString().slice(0, 10);

      await connection.query(
        'INSERT INTO expenses (vehicle_id, expense_type, cost, description, date) VALUES (?, ?, ?, ?, ?);',
        [vehicleId, type, cost, desc, dateStr]
      );
      sqlStatements.push(`INSERT INTO expenses (vehicle_id, expense_type, cost, description, date) VALUES (${vehicleId}, '${type}', ${cost.toFixed(2)}, '${desc}', '${dateStr}');`);
    }
    console.log('Expenses seeded.');

    // Write statements to database/seed.sql
    fs.writeFileSync(path.join(__dirname, 'seed.sql'), sqlStatements.join('\n'), 'utf8');
    console.log('Seed SQL file written successfully to database/seed.sql');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await connection.end();
  }
}

seed();
