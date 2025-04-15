import jwt from 'jsonwebtoken';
import { pool } from '../../lib/db.js'; // Updated import path

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Ensure this matches token generation

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // --- Authentication Check ---
  let decoded;
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('Auth Error: No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    decoded = jwt.verify(token, JWT_SECRET);

    // Optional: Check if user still exists in DB (good practice)
    const [users] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [decoded.id]
    );
    if (!users || users.length === 0) {
        console.log(`Auth Error: User ID ${decoded.id} from token not found in DB`);
        return res.status(401).json({ message: 'User not found or invalid token' });
    }

    // User is authenticated, proceed...
    console.log(`Authenticated user ID: ${decoded.id}`);

  } catch (error) {
    console.error('Auth Error:', error.message || error);
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
  // --- End Authentication Check ---


  // --- Get Profile Logic (from original getProfile controller) ---
  try {
    const userId = decoded.id; // Get user ID from the decoded token

    // Get user data (exclude password)
    const [users] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      // This should ideally not happen if auth check passed, but handle defensively
      console.log(`Profile Error: User ID ${userId} passed auth but not found for profile retrieval.`);
      return res.status(404).json({ message: 'User profile not found' });
    }

    const user = users[0];

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Profile fetch error:', error);
    if (error.sqlMessage) {
        console.error('SQL Error:', error.sqlMessage);
    }
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
} 