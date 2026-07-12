const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'transitops_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connectivity
pool.getConnection()
  .then(conn => {
    console.log('Connected to MySQL Database Pool successfully.');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = pool;
