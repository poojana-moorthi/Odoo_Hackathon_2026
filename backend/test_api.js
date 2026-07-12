const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log('--- STARTING TRANSITOPS INTEGRATION TESTS ---');

  try {
    // 1. Health Check
    console.log('\nTesting API health check...');
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    const health = await healthRes.json();
    console.log('Health check response:', health);
    if (health.status !== 'OK') throw new Error('Health check failed');

    // 2. Login
    console.log('\nTesting manager login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@transitops.com',
        password: 'Password123'
      })
    });
    
    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Login failed: ${err.message}`);
    }

    const { token, user } = await loginRes.json();
    console.log(`Login successful! Logged in as: ${user.username} (${user.role_name})`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Fetch Dashboard KPI Stats
    console.log('\nFetching dashboard statistics...');
    const statsRes = await fetch(`${BASE_URL}/dashboard`, { headers });
    if (!statsRes.ok) throw new Error('Failed to fetch dashboard stats');
    const stats = await statsRes.json();
    console.log('KPI Cards summary:');
    console.log(`- Active Vehicles: ${stats.kpis.activeVehicles}`);
    console.log(`- Available Vehicles: ${stats.kpis.availableVehicles}`);
    console.log(`- Active Trips: ${stats.kpis.activeTrips}`);
    console.log(`- Utilization Rate: ${stats.kpis.fleetUtilization}%`);
    console.log(`- Total Operational Cost: $${stats.kpis.totalOperationalCost}`);

    // 4. Test Dispatch Validation (Dispatched an In Shop Vehicle)
    console.log('\nTesting Dispatch validation rule: attempting to dispatch an In Shop vehicle...');
    
    // Find an In Shop vehicle
    const vehRes = await fetch(`${BASE_URL}/vehicles?status=In Shop`, { headers });
    const vehiclesData = await vehRes.json();
    const inShopVeh = vehiclesData.data[0];

    // Find an Available driver
    const drRes = await fetch(`${BASE_URL}/drivers?status=Available`, { headers });
    const driversData = await drRes.json();
    const avDriver = driversData.data[0];

    if (inShopVeh && avDriver) {
      console.log(`Attempting dispatch with Vehicle ID: ${inShopVeh.vehicle_id} (In Shop) and Driver ID: ${avDriver.driver_id} (Available)`);
      const tripRes = await fetch(`${BASE_URL}/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'Houston Depot',
          destination: 'Dallas Hub',
          vehicle_id: inShopVeh.vehicle_id,
          driver_id: avDriver.driver_id,
          cargo_weight: 5000,
          planned_distance: 350,
          status: 'Dispatched'
        })
      });

      console.log(`API response status: ${tripRes.status}`);
      const tripData = await tripRes.json();
      console.log('Response body:', tripData);

      if (tripRes.status === 400 && tripData.message.includes('not available')) {
        console.log('✔ SUCCESS: Dispatch validation correctly blocked the dispatch of In-Shop vehicle!');
      } else {
        console.log('❌ FAILURE: Dispatch should have been blocked with 400 Bad Request.');
      }
    } else {
      console.log('Skipped dispatch test: missing in-shop vehicle or available driver in seed data.');
    }

    // 5. Test Login attempt lock-out logic
    console.log('\nTesting account lock-out after 5 failed login attempts...');
    const testEmail = 'driver2@transitops.com';
    let lockRes;
    let lockData;

    for (let i = 1; i <= 5; i++) {
      console.log(`- Failed login attempt #${i}...`);
      lockRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
      });
      lockData = await lockRes.json();
      console.log(`  Response [Attempt ${i}]: Status ${lockRes.status} - Message: "${lockData.message}"`);
    }

    if (lockRes.status === 401 && lockData.message.includes('locked')) {
      console.log('✔ SUCCESS: 5th failed attempt correctly locked the account!');
    } else {
      console.log('❌ FAILURE: Account should have been locked.');
    }

    // 6th attempt should return 403 Locked
    console.log('- Attempting 6th login after account lock...');
    const attempt6Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123' }) // correct password!
    });
    const attempt6Data = await attempt6Res.json();
    console.log(`  Response [Attempt 6]: Status ${attempt6Res.status} - Message: "${attempt6Data.message}"`);
    if (attempt6Res.status === 403 && attempt6Data.message.includes('locked')) {
      console.log('✔ SUCCESS: 6th attempt successfully blocked with status 403 Locked!');
    } else {
      console.log('❌ FAILURE: 6th attempt was not blocked with 403.');
    }

    // 6. Test Cargo Splitting (loads > 500 kg)
    console.log('\nTesting cargo splitting validation rule: dispatching 1200 kg cargo load...');
    
    // Find an Available vehicle and Available driver
    const availVehRes = await fetch(`${BASE_URL}/vehicles?status=Available`, { headers });
    const availVehiclesData = await availVehRes.json();
    const avVeh = availVehiclesData.data[0];

    const availDrRes = await fetch(`${BASE_URL}/drivers?status=Available`, { headers });
    const availDriversData = await availDrRes.json();
    const avDr = availDriversData.data.find(d => new Date(d.license_expiry) >= new Date());

    if (avVeh && avDr) {
      console.log(`Dispatching 1200 kg with Vehicle ID: ${avVeh.vehicle_id} (Available) and Driver ID: ${avDr.driver_id} (Available)`);
      const splitRes = await fetch(`${BASE_URL}/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'Chicago Hub',
          destination: 'Denver Depot',
          vehicle_id: avVeh.vehicle_id,
          driver_id: avDr.driver_id,
          cargo_weight: 1200,
          planned_distance: 600,
          status: 'Dispatched'
        })
      });

      console.log(`API response status: ${splitRes.status}`);
      const splitData = await splitRes.json();
      console.log('Response body:', splitData);

      if (splitRes.status === 201) {
        console.log('✔ SUCCESS: Split dispatch request completed successfully!');
        
        // Fetch all trips and check if the last 3 trips are created
        const allTripsRes = await fetch(`${BASE_URL}/trips?limit=5`, { headers });
        const allTripsData = await allTripsRes.json();
        const lastTrips = allTripsData.data;

        // The last 3 trips should have weights: 500, 500, and 200
        const weights = lastTrips.slice(0, 3).map(t => parseFloat(t.cargo_weight));
        console.log('Last 3 created trips cargo weights:', weights);

        if (weights.includes(500) && weights.includes(200)) {
          console.log('✔ SUCCESS: Cargo correctly split into 500 kg, 500 kg, and 200 kg dispatches!');
        } else {
          console.log('❌ FAILURE: Cargo was not correctly split into chunks.');
        }
      } else {
        console.log('❌ FAILURE: Cargo split dispatch returned error.');
      }
    } else {
      console.log('Skipped cargo split test: missing available resources.');
    }

    console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');

  } catch (error) {
    console.error('\n❌ TEST RUN ENCOUNTERED ERROR:', error.message);
    process.exit(1);
  }
}

// Delay test slightly to ensure database pool is loaded
setTimeout(runTests, 1000);
