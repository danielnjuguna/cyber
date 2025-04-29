import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const generateToken = (user) => {
  // User should be an object containing id, email, and role
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// Check if the user is a superadmin
export const checkSuperAdminAuth = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!users || users.length === 0) {
      res.status(401).json({ message: 'User not found' });
      return null;
    }
    
    if (users[0].role !== 'superadmin') {
      res.status(403).json({ message: 'Super Admin access required' });
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Super Admin Auth Error:', error.message || error);
    res.status(401).json({ message: 'Authentication failed' });
    return null;
  }
}; 