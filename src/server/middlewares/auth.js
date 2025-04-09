import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const [rows] = await pool.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('User not found');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists and is an admin
    const [rows] = await pool.execute(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('User not found');
    }
    
    if (rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate as admin' });
  }
};

export const generateToken = (user) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
