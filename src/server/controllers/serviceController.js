import { pool } from '../config/db.js';
import fs from 'fs';

// Get all services
export const getAllServices = async (req, res) => {
  try {
    const [services] = await pool.execute(
      'SELECT id, title, description, long_description, image_path, created_at, updated_at FROM services'
    );

    res.status(200).json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get service by ID
export const getServiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const [services] = await pool.execute(
      'SELECT id, title, description, long_description, image_path, created_at, updated_at FROM services WHERE id = ?',
      [id]
    );

    if (!Array.isArray(services) || services.length === 0) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    res.status(200).json({ service: services[0] });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new service
export const createService = async (req, res) => {
  try {
    const { title, description, long_description } = req.body;
    let imagePath = null;

    // If image was uploaded
    if (req.file) {
      imagePath = `/uploads/images/${req.file.filename}`;
    }

    const [result] = await pool.execute(
      'INSERT INTO services (title, description, long_description, image_path) VALUES (?, ?, ?, ?)',
      [title, description, long_description || description, imagePath]
    );

    res.status(201).json({
      message: 'Service created successfully',
      service: {
        id: result.insertId,
        title,
        description,
        long_description,
        image_path: imagePath
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update service
export const updateService = async (req, res) => {
  const { id } = req.params;
  const { title, description, long_description } = req.body;

  try {
    // Get current service data
    const [services] = await pool.execute(
      'SELECT image_path FROM services WHERE id = ?',
      [id]
    );

    if (!Array.isArray(services) || services.length === 0) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    let imagePath = services[0].image_path;

    // If new image was uploaded
    if (req.file) {
      // Delete old image if exists
      if (imagePath && fs.existsSync(`.${imagePath}`)) {
        fs.unlinkSync(`.${imagePath}`);
      }
      
      imagePath = `/uploads/images/${req.file.filename}`;
    }

    // Update service
    await pool.execute(
      'UPDATE services SET title = ?, description = ?, long_description = ?, image_path = ? WHERE id = ?',
      [title, description, long_description || description, imagePath, id]
    );

    res.status(200).json({
      message: 'Service updated successfully',
      service: {
        id,
        title,
        description,
        long_description,
        image_path: imagePath
      }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    // Get current service data to delete image
    const [services] = await pool.execute(
      'SELECT image_path FROM services WHERE id = ?',
      [id]
    );

    if (!Array.isArray(services) || services.length === 0) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }

    // Delete image if exists
    const imagePath = services[0].image_path;
    if (imagePath && fs.existsSync(`.${imagePath}`)) {
      fs.unlinkSync(`.${imagePath}`);
    }

    // Delete service
    await pool.execute('DELETE FROM services WHERE id = ?', [id]);

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
