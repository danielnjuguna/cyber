import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../../lib/db.js'; // Updated import path
import { generateToken } from '../../middlewares/auth.js'; // Needed if creating user returns token

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// --- Admin Authentication Check Function ---
// Reusable function to check for admin privileges
async function checkAdminAuth(req, res) {
  console.log(`🛡️ checkAdminAuth called for: ${req.method} ${req.originalUrl || req.url}`);
  try {
    const authHeader = req.headers.authorization;
    console.log(`   Auth Header: ${authHeader ? authHeader.substring(0, 15) + '...' : 'Not Present'}`);
    
    const token = authHeader?.replace('Bearer ', '');
    if (!token) { 
      console.log('   ❌ Admin Auth Error: No token extracted');
      res.status(401).json({ message: 'Authentication required' }); 
      return null; // Indicate auth failure
    }
    console.log(`   Token Extracted: ${token.substring(0, 10)}...`);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`   Token Decoded: User ID ${decoded.id}`);

    // Check if user exists and is an admin
    const [users] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) { 
      console.log(`   ❌ Admin Auth Error: User ID ${decoded.id} not found in DB`);
      res.status(401).json({ message: 'User not found or invalid token' }); 
      return null; // Indicate auth failure
    }

    if (users[0].role !== 'admin') { 
      console.log(`   ❌ Admin Auth Error: User ID ${decoded.id} Role (${users[0].role}) is not admin`);
      res.status(403).json({ message: 'Admin access required' }); 
      return null; // Indicate auth failure
    }

    console.log(`   ✅ Admin authenticated: User ID ${decoded.id}`);
    return decoded; // Return decoded token payload on success

  } catch (error) { 
    console.error('   ❌ Admin Auth Error Caught:', error.name, error.message);
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
        res.status(401).json({ message: 'Token expired' });
    } else {
        res.status(401).json({ message: 'Authentication failed' });
    }
    return null; // Indicate auth failure
  }
}

// --- Main Handler ---
export default async function handler(req, res) {

  // --- Check Admin Auth ---
  const authenticatedUser = await checkAdminAuth(req, res);
  if (!authenticatedUser) {
    // If auth failed, checkAdminAuth already sent the response
    return;
  }
  // User is authenticated as admin, proceed...


  // --- Route based on HTTP method ---
  if (req.method === 'GET') {
    // --- Handle GET: Get all users (Admin) ---
    try {
      console.log('GET /api/users request (admin)');
      const [users] = await pool.execute(
        'SELECT id, email, phone, role, created_at FROM users ORDER BY created_at DESC'
      );
      return res.status(200).json({ users });
    } catch (error) {
      console.error('Get all users error:', error);
       if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error fetching users' });
    }

  } else if (req.method === 'POST') {
    // --- Handle POST: Create new user (Admin) ---
    const { email, phone, password, role } = req.body;
    console.log('POST /api/users request (admin)', { email, role });

    try {
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const [existingUser] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (Array.isArray(existingUser) && existingUser.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user with specified role (default to 'user' if not provided)
      const [result] = await pool.execute(
        'INSERT INTO users (email, phone, password, role) VALUES (?, ?, ?, ?)',
        [email, phone || null, hashedPassword, role || 'user']
      );

      const userId = result.insertId;

      // Get the complete user data (excluding password)
      const [userData] = await pool.execute(
        'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (!userData || userData.length === 0) {
        console.error(`Failed to retrieve user data after admin insert for ID: ${userId}`);
        return res.status(500).json({ message: 'Failed to retrieve user data after creation' });
      }

      const newUser = userData[0];

      return res.status(201).json({
        message: 'User created successfully by admin',
        user: newUser
      });

    } catch (error) {
      console.error('Create user (admin) error:', error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      // Check for duplicate entry error specifically
      if (error.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'User with this email already exists.' });
      }
      return res.status(500).json({ message: 'Server error creating user' });
    }

  } else {
    // Handle unsupported methods
    console.log(`Method ${req.method} not allowed for /api/users`);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 