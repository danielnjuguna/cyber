import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db.js';
import { auth, adminAuth } from '../middlewares/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/server/uploads/services');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Only image files are allowed'));
  }
});

// Get all services - public route
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM services ORDER BY created_at DESC'
    );
    
    res.json({ services: rows });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single service - public route
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM services WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ service: rows[0] });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new service - admin only
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, long_description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Prepare image path if uploaded
    const image_path = req.file ? `/uploads/services/${req.file.filename}` : null;
    
    const [result] = await pool.execute(
      'INSERT INTO services (title, description, long_description, image_path) VALUES (?, ?, ?, ?)',
      [title, description, long_description || '', image_path]
    );
    
    // Get the newly created service
    const [rows] = await pool.execute(
      'SELECT * FROM services WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Service created successfully',
      service: rows[0]
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service - admin only
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, long_description } = req.body;
    const { id } = req.params;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Check if service exists
    const [existingService] = await pool.execute(
      'SELECT * FROM services WHERE id = ?',
      [id]
    );
    
    if (existingService.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Prepare image path if uploaded
    const image_path = req.file 
      ? `/uploads/services/${req.file.filename}` 
      : existingService[0].image_path;
    
    await pool.execute(
      'UPDATE services SET title = ?, description = ?, long_description = ?, image_path = ?, updated_at = NOW() WHERE id = ?',
      [title, description, long_description || '', image_path, id]
    );
    
    // Get the updated service
    const [rows] = await pool.execute(
      'SELECT * FROM services WHERE id = ?',
      [id]
    );
    
    res.json({ 
      message: 'Service updated successfully',
      service: rows[0]
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete service - admin only
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const [existingService] = await pool.execute(
      'SELECT * FROM services WHERE id = ?',
      [id]
    );
    
    if (existingService.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    await pool.execute(
      'DELETE FROM services WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 