const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const tripRoutes = require('./routes/tripRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for testing/development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TransitOps API is healthy' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api', reportRoutes); // contains /dashboard and /reports

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `API Route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Server Error:', err.stack);
  res.status(500).json({ 
    message: 'An unexpected server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`TransitOps Express REST API Server running on port ${PORT}`);
});

// Background License Expiry Check Scheduler
const db = require('./config/db');

async function checkLicenseExpirations() {
  try {
    const [drivers] = await db.query(
      `SELECT driver_id, driver_name, license_number, license_expiry, phone_number 
       FROM drivers 
       WHERE license_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    if (drivers.length > 0) {
      console.log(`\n⏰ [LICENSE EXPIRY SCHEDULER] Found ${drivers.length} driver(s) with licenses expiring within 30 days:`);
      for (const d of drivers) {
        const mockEmail = `${d.driver_name.toLowerCase().replace(/\s+/g, '')}@transitops.com`;
        console.log(`📬 [EMAIL REMINDER SENT] To: ${mockEmail} | Subject: Action Required: Driver License Expiry Warning`);
        console.log(`   Message: Dear ${d.driver_name}, your license (${d.license_number}) is scheduled to expire on ${new Date(d.license_expiry).toISOString().slice(0, 10)}. Please initiate renewal steps immediately to avoid suspension.`);
      }
      console.log('--------------------------------------------------\n');
    } else {
      console.log('\n[LICENSE EXPIRY SCHEDULER] No driver licenses expiring within 30 days.\n');
    }
  } catch (err) {
    console.error('[LICENSE EXPIRY SCHEDULER] Error checking driver license expirations:', err);
  }
}

// Run immediately on server start after DB pool initializes
setTimeout(checkLicenseExpirations, 2500);

// Run every 24 hours
setInterval(checkLicenseExpirations, 24 * 60 * 60 * 1000);
