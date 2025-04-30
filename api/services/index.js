import jwt from 'jsonwebtoken';
import { pool } from '../../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// --- Admin Authentication Check Function (Reusable) ---
async function checkAdminAuth(req, res) {
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
    // Accept both admin and superadmin roles
    if (users[0].role !== 'admin' && users[0].role !== 'superadmin') {
      res.status(403).json({ message: 'Admin or Superadmin access required' });
      return null;
    }
    // Return the decoded token AND the user's role
    return { ...decoded, role: users[0].role };
  } catch (error) {
    console.error('Admin Auth Check Error:', error.message || error); // Log the actual error
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired' });
    } else {
      res.status(401).json({ message: 'Authentication failed' });
    }
    return null;
  }
}

// --- Main Handler ---
export default async function handler(req, res) {
  // Handle GET request to fetch all services (Public)
  if (req.method === 'GET') {
    try {
      console.log('GET /api/services request');
      const [services] = await pool.execute('SELECT id, title, description, long_description, image_url, image_key, created_at, updated_at FROM services ORDER BY created_at DESC');
      return res.status(200).json({ services });
    } catch (error) {
      console.error('Get services error:', error);
      return res.status(500).json({ message: 'Server error fetching services' });
    }
  } 
  // Handle POST request to create a new service (Admin Only)
  else if (req.method === 'POST') {
    // Authenticate admin
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;

    try {
      console.log('POST /api/services request (admin)');
      const { 
        title, 
        description, 
        long_description, 
        imageUrl, 
        imageKey 
      } = req.body;

      console.log('Received payload:', req.body);

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      // Image is optional, but if URL is present, Key should be too
       if (imageUrl && !imageKey) {
         console.warn('Image URL provided but Key is missing.');
       }

      // Insert service into database with URL and Key
      const [result] = await pool.execute(
        'INSERT INTO services (title, description, long_description, image_url, image_key) VALUES (?, ?, ?, ?, ?)',
        [title, description, long_description || null, imageUrl || null, imageKey || null]
      );

       const newServiceId = result.insertId;
       console.log(`Service created with ID: ${newServiceId}`);

      // Fetch the created service to return it
      const [serviceData] = await pool.execute(
         // Select the new URL/Key columns
        'SELECT id, title, description, long_description, image_url, image_key, created_at, updated_at FROM services WHERE id = ?',
        [newServiceId]
      );

      return res.status(201).json({ 
        message: 'Service created successfully',
        service: serviceData[0] || null
      });
    } catch (error) {
      console.error('Create service error:', error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error creating service' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 