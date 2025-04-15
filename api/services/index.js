import jwt from 'jsonwebtoken';
import { pool } from '../../lib/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(dirname(dirname(__dirname)), 'uploads');

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
    if (users[0].role !== 'admin') { 
      res.status(403).json({ message: 'Admin access required' }); 
      return null; 
    }
    return decoded;
  } catch (error) { 
    res.status(401).json({ message: 'Authentication failed' }); 
    return null; 
  }
}

// --- Helper to save file locally ---
async function saveFileLocally(file, type) {
  try {
    // Debug received file object structure
    console.log(`File object for ${type}:`, file);
    
    // Check if file is an array (formidable v3+ structure)
    const fileObj = Array.isArray(file) ? file[0] : file;
    
    if (!fileObj || !fileObj.filepath) {
      throw new Error(`Invalid file object for ${type}`);
    }
    
    // Create directory if it doesn't exist
    const targetDir = path.join(uploadsDir, 'services');
    await fs.mkdir(targetDir, { recursive: true });
    
    // Get original filename and sanitize it
    const originalName = fileObj.originalFilename 
      ? fileObj.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_') 
      : `${Date.now()}.${fileObj.mimetype?.split('/')[1] || 'file'}`;
            
    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${originalName}`;
    const targetPath = path.join(targetDir, uniqueFilename);
    
    // Copy the file from the temp location to our uploads directory
    await fs.copyFile(fileObj.filepath, targetPath);
    console.log(`File saved to ${targetPath}`);
    
    // Return the path that will be stored in the database and used in URLs
    // Make sure to use / instead of \ for web URLs even on Windows
    const webPath = `/uploads/services/${uniqueFilename}`;
    console.log(`Web path for file: ${webPath}`);
    return webPath;
  } catch (error) {
    console.error(`File save error for ${type}:`, error);
    throw new Error(`Failed to save ${type}: ${error.message}`);
  }
}

// --- Main Handler ---
export default async function handler(req, res) {
  // Handle GET request to fetch all services (Public)
  if (req.method === 'GET') {
    try {
      console.log('GET /api/services request');
      const [services] = await pool.execute('SELECT * FROM services ORDER BY created_at DESC');
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
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);

      // Extract form fields
      const title = Array.isArray(req.body.title) ? req.body.title[0] : req.body.title;
      const description = Array.isArray(req.body.description) ? req.body.description[0] : req.body.description;
      const longDescription = Array.isArray(req.body.long_description) ? req.body.long_description[0] : req.body.long_description;
      
      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }

      // Check if image file exists
      let imagePath = null;
      if (req.files && req.files.image) {
        try {
          imagePath = await saveFileLocally(req.files.image, 'image');
        } catch (error) {
          console.error('Image save error:', error);
          // Continue without image if there's an error
        }
      }

      // Insert service into database - match the schema from reset-db.js
      const [result] = await pool.execute(
        'INSERT INTO services (title, description, long_description, image_path) VALUES (?, ?, ?, ?)',
        [title, description, longDescription || null, imagePath]
      );

      // Fetch the created service to return it
      const [serviceData] = await pool.execute(
        'SELECT * FROM services WHERE id = ?',
        [result.insertId]
      );

      return res.status(201).json({ 
        message: 'Service created successfully',
        service: serviceData[0] || null
      });
    } catch (error) {
      console.error('Create service error:', error);
      return res.status(500).json({ message: 'Server error creating service' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 