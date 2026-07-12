const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. KPI Queries
    const [vehiclesCount] = await db.query(
      `SELECT 
        SUM(CASE WHEN status = 'On Trip' THEN 1 ELSE 0 END) as activeVehicles,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as availableVehicles,
        SUM(CASE WHEN status = 'In Shop' THEN 1 ELSE 0 END) as shopVehicles,
        COUNT(*) as totalVehicles
       FROM vehicles`
    );

    const [tripsCount] = await db.query(
      `SELECT 
        SUM(CASE WHEN status = 'Dispatched' THEN 1 ELSE 0 END) as activeTrips,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as pendingTrips
       FROM trips`
    );

    const [driversCount] = await db.query(
      `SELECT COUNT(*) as onDutyDrivers FROM drivers WHERE status = 'On Trip'`
    );

    const stats = vehiclesCount[0];
    const tripStats = tripsCount[0];
    const driverStats = driversCount[0];

    const activeVehicles = stats.activeVehicles || 0;
    const totalVehicles = stats.totalVehicles || 0;
    const fleetUtilization = totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0;

    // 2. Quick Cost aggregates
    const [fuelSum] = await db.query('SELECT SUM(fuel_cost) as totalFuelCost FROM fuel_logs');
    const [maintenanceExpenseSum] = await db.query("SELECT SUM(cost) as totalMaintCost FROM expenses WHERE expense_type IN ('Maintenance', 'Repair')");
    const [allExpenseSum] = await db.query('SELECT SUM(cost) as totalExpenseCost FROM expenses');

    const totalFuel = parseFloat(fuelSum[0].totalFuelCost || 0);
    const totalMaint = parseFloat(maintenanceExpenseSum[0].totalMaintCost || 0);
    const totalExpense = parseFloat(allExpenseSum[0].totalExpenseCost || 0);
    const totalOperationalCost = totalFuel + totalExpense;

    // 3. Trip status counts
    const [tripStatuses] = await db.query('SELECT status, COUNT(*) as count FROM trips GROUP BY status');
    
    // 4. Vehicle status counts
    const [vehicleStatuses] = await db.query('SELECT status, COUNT(*) as count FROM vehicles GROUP BY status');

    // 5. Fuel usage over time (latest 6 logs)
    const [fuelHistory] = await db.query(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as label, SUM(fuel_liters) as fuel
       FROM fuel_logs
       GROUP BY label
       ORDER BY label DESC
       LIMIT 6`
    );

    // 6. Latest Trips
    const [latestTrips] = await db.query(
      `SELECT t.*, v.vehicle_name, d.driver_name
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id
       JOIN drivers d ON t.driver_id = d.driver_id
       ORDER BY t.trip_id DESC
       LIMIT 5`
    );

    return res.json({
      kpis: {
        activeVehicles,
        availableVehicles: stats.availableVehicles || 0,
        inMaintenance: stats.shopVehicles || 0,
        activeTrips: tripStats.activeTrips || 0,
        pendingTrips: tripStats.pendingTrips || 0,
        driversOnDuty: driverStats.onDutyDrivers || 0,
        fleetUtilization,
        totalFuelCost: totalFuel,
        totalMaintenanceCost: totalMaint,
        totalOperationalCost
      },
      charts: {
        tripStatus: tripStatuses,
        vehicleStatus: vehicleStatuses,
        fuelUsage: fuelHistory.reverse()
      },
      latestTrips
    });

  } catch (error) {
    console.error('GetDashboardStats error:', error);
    return res.status(500).json({ message: 'Server error retrieving dashboard stats.' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // 1. Fuel efficiency by vehicle (Actual Distance / Fuel Used for Completed trips)
    const [fuelEfficiency] = await db.query(
      `SELECT v.vehicle_name, v.registration_number,
              SUM(t.actual_distance) as totalDistance,
              SUM(t.fuel_used) as totalFuel,
              ROUND(SUM(t.actual_distance) / SUM(t.fuel_used), 2) as efficiency
       FROM trips t
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id
       WHERE t.status = 'Completed' AND t.fuel_used > 0
       GROUP BY v.vehicle_id
       LIMIT 10`
    );

    // 2. Operational Cost breakdown by Vehicle
    const [vehicleCosts] = await db.query(
      `SELECT v.vehicle_name, v.registration_number,
              COALESCE((SELECT SUM(fuel_cost) FROM fuel_logs WHERE vehicle_id = v.vehicle_id), 0) as fuelCost,
              COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.vehicle_id), 0) as expenseCost
       FROM vehicles v
       LIMIT 10`
    );

    // Formulate cost data
    const formattedCosts = vehicleCosts.map(vc => ({
      vehicle_name: vc.vehicle_name,
      registration_number: vc.registration_number,
      fuelCost: parseFloat(vc.fuelCost),
      expenseCost: parseFloat(vc.expenseCost),
      totalCost: parseFloat(vc.fuelCost) + parseFloat(vc.expenseCost)
    }));

    // 3. Monthly Trips summary
    const [monthlyTrips] = await db.query(
      `SELECT DATE_FORMAT(dispatch_date, '%b %Y') as month, COUNT(*) as count
       FROM trips
       WHERE status = 'Completed' AND dispatch_date IS NOT NULL
       GROUP BY month
       ORDER BY MIN(dispatch_date) ASC`
    );

    // 4. Monthly Fuel spend summary
    const [monthlyFuel] = await db.query(
      `SELECT DATE_FORMAT(date, '%b %Y') as month, SUM(fuel_cost) as cost
       FROM fuel_logs
       GROUP BY month
       ORDER BY MIN(date) ASC`
    );

    // 5. Monthly Expenses summary
    const [monthlyExpenses] = await db.query(
      `SELECT DATE_FORMAT(date, '%b %Y') as month, SUM(cost) as cost
       FROM expenses
       GROUP BY month
       ORDER BY MIN(date) ASC`
    );

    // 6. Vehicle ROI: (Total Trips Completed * Avg Revenue vs Purchase Cost)
    // Assume revenue = Cargo Weight * 0.1 + Planned Distance * 2.0 (mock revenue calculation)
    const [vehicleROI] = await db.query(
      `SELECT v.vehicle_name, v.registration_number, v.purchase_cost,
              COUNT(t.trip_id) as completedTrips,
              ROUND(SUM(t.actual_distance * 2.0 + t.cargo_weight * 0.1), 2) as estimatedRevenue
       FROM vehicles v
       LEFT JOIN trips t ON v.vehicle_id = t.vehicle_id AND t.status = 'Completed'
       GROUP BY v.vehicle_id
       LIMIT 10`
    );

    const formattedROI = vehicleROI.map(vr => {
      const revenue = parseFloat(vr.estimatedRevenue || 0);
      const purchaseCost = parseFloat(vr.purchase_cost);
      const roiPercent = purchaseCost > 0 ? ((revenue / purchaseCost) * 100).toFixed(1) : 0;
      return {
        vehicle_name: vr.vehicle_name,
        registration_number: vr.registration_number,
        purchaseCost,
        revenue,
        roiPercent
      };
    });

    return res.json({
      fuelEfficiency,
      vehicleCosts: formattedCosts,
      monthlyTrips,
      monthlyFuel,
      monthlyExpenses,
      vehicleROI: formattedROI
    });
  } catch (error) {
    console.error('GetAnalytics error:', error);
    return res.status(500).json({ message: 'Server error retrieving analytics reports.' });
  }
};
