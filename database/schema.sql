CREATE DATABASE IF NOT EXISTS transitops_db;
USE transitops_db;

-- Drop tables in reverse dependency order if they exist
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS trip_history;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS fuel_logs;
DROP TABLE IF EXISTS maintenance_logs;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- 1. Roles table
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- 2. Users table
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  login_attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 3. Vehicles table
CREATE TABLE vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  maximum_load_capacity DECIMAL(10,2) NOT NULL,
  current_odometer INT NOT NULL,
  purchase_cost DECIMAL(12,2) NOT NULL,
  status ENUM('Available', 'On Trip', 'In Shop', 'Retired') DEFAULT 'Available'
);

-- 4. Drivers table
CREATE TABLE drivers (
  driver_id INT AUTO_INCREMENT PRIMARY KEY,
  driver_name VARCHAR(100) NOT NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  license_category VARCHAR(20) NOT NULL,
  license_expiry DATE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  safety_score DECIMAL(5,2) DEFAULT 100.00,
  status ENUM('Available', 'On Trip', 'Off Duty', 'Suspended') DEFAULT 'Available'
);

-- 5. Trips table
CREATE TABLE trips (
  trip_id INT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  cargo_weight DECIMAL(10,2) NOT NULL,
  planned_distance DECIMAL(10,2) NOT NULL,
  actual_distance DECIMAL(10,2) DEFAULT NULL,
  fuel_used DECIMAL(10,2) DEFAULT NULL,
  status ENUM('Draft', 'Dispatched', 'Completed', 'Cancelled') DEFAULT 'Draft',
  dispatch_date DATETIME DEFAULT NULL,
  completion_date DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
  FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);

-- 6. Maintenance Logs table
CREATE TABLE maintenance_logs (
  maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  issue VARCHAR(255) NOT NULL,
  maintenance_type ENUM('Routine', 'Repair', 'Inspection', 'Emergency') NOT NULL,
  start_date DATE NOT NULL,
  expected_completion DATE NOT NULL,
  status ENUM('In Shop', 'Completed') DEFAULT 'In Shop',
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

-- 7. Fuel Logs table
CREATE TABLE fuel_logs (
  fuel_log_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  date DATE NOT NULL,
  fuel_liters DECIMAL(10,2) NOT NULL,
  fuel_cost DECIMAL(10,2) NOT NULL,
  odometer INT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

-- 8. Expenses table
CREATE TABLE expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  expense_type ENUM('Maintenance', 'Repair', 'Toll', 'Insurance', 'Parking', 'Miscellaneous') NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

-- 9. Trip History table
CREATE TABLE trip_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  status ENUM('Draft', 'Dispatched', 'Completed', 'Cancelled') NOT NULL,
  status_change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255),
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
);

-- 10. Notifications table
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
