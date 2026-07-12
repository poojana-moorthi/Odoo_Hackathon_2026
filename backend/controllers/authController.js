const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_transitops_token_key_2026';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '86400';

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = ?`, 
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];

    if (user.status === 'Locked') {
      return res.status(403).json({ message: 'Account locked due to 5 consecutive failed login attempts. Contact your Administrator.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const newAttempts = (user.login_attempts || 0) + 1;
      
      if (newAttempts >= 5) {
        // Lock account
        await db.query("UPDATE users SET login_attempts = ?, status = 'Locked' WHERE user_id = ?", [newAttempts, user.user_id]);
        return res.status(401).json({ message: 'Invalid credentials. This account has been locked due to 5 consecutive failed attempts.' });
      } else {
        // Increment attempts
        await db.query("UPDATE users SET login_attempts = ? WHERE user_id = ?", [newAttempts, user.user_id]);
        const attemptsLeft = 5 - newAttempts;
        return res.status(401).json({ message: `Invalid credentials. Attempts remaining: ${attemptsLeft}` });
      }
    }

    // Reset attempts on successful authentication
    await db.query("UPDATE users SET login_attempts = 0 WHERE user_id = ?", [user.user_id]);

    // Generate JWT
    const payload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: parseInt(JWT_EXPIRATION) });

    return res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.logout = (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
};

exports.checkAuth = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, u.status, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account deactivated.' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('CheckAuth error:', error);
    return res.status(500).json({ message: 'Server error checking authentication.' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  try {
    const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, req.user.user_id]);
    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Server error changing password.' });
  }
};

// User management endpoints (Settings page)
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, u.status, u.created_at, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id`
    );
    return res.json(users);
  } catch (error) {
    console.error('GetUsers error:', error);
    return res.status(500).json({ message: 'Server error retrieving users.' });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM roles');
    return res.json(roles);
  } catch (error) {
    console.error('GetRoles error:', error);
    return res.status(500).json({ message: 'Server error retrieving roles.' });
  }
};

exports.updateUserRole = async (req, res) => {
  const { target_user_id, role_id } = req.body;
  if (!target_user_id || !role_id) {
    return res.status(400).json({ message: 'target_user_id and role_id are required.' });
  }

  try {
    await db.query('UPDATE users SET role_id = ? WHERE user_id = ?', [role_id, target_user_id]);
    return res.json({ message: 'User role updated successfully.' });
  } catch (error) {
    console.error('UpdateUserRole error:', error);
    return res.status(500).json({ message: 'Server error updating user role.' });
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password, role_id } = req.body;
  if (!username || !email || !password || !role_id) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if user exists
    const [exists] = await db.query('SELECT user_id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (exists.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await db.query(
      'INSERT INTO users (username, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?)',
      [username, email, hash, role_id, 'Active']
    );

    return res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    console.error('CreateUser error:', error);
    return res.status(500).json({ message: 'Server error creating user.' });
  }
};