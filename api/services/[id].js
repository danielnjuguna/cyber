// Remove local file system dependencies
// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// Import only what we need
import jwt from 'jsonwebtoken';
import { pool } from '../../lib/db.js';
import { deleteFile } from '../core.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const uploadsDir = path.join(dirname(dirname(__dirname)), 'uploads');

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
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: 'Invalid service ID' });
  }
  
  const serviceId = parseInt(id);

  // GET service by ID
  if (req.method === 'GET') {
    try {
      console.log(`GET /api/services/${serviceId} request`);
      // Select URL/Key columns
      const [services] = await pool.execute(
        'SELECT id, title, description, long_description, image_url, image_key, created_at, updated_at FROM services WHERE id = ?', 
        [serviceId]
      );
      
      if (!services || services.length === 0) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      return res.status(200).json({ service: services[0] });
    } catch (error) {
      console.error(`Get service ${serviceId} error:`, error);
      return res.status(500).json({ message: 'Server error fetching service' });
    }
  } 
  // PUT to update a service
  else if (req.method === 'PUT') {
    // Admin authentication
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;
    
    try {
      console.log(`PUT /api/services/${serviceId} request (admin)`);
      // Expecting JSON payload
      const { 
        title, 
        description, 
        long_description, 
        imageUrl, 
        imageKey 
      } = req.body;
      
      console.log('Received payload for update:', req.body);

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      // If URL is present, key should be too
       if (imageUrl && !imageKey) return res.status(400).json({ message: 'Image Key is missing.' });
      
      // 1. Get current service data (including old key)
      const [currentServices] = await pool.execute(
        'SELECT image_key FROM services WHERE id = ?',
        [serviceId]
      );
      
      if (!currentServices || currentServices.length === 0) {
        return res.status(404).json({ message: 'Service not found for update.' });
      }
      
      const oldService = currentServices[0];
      console.log('Old image key:', oldService.image_key);
      
      // 2. Update database with new data
      const updateFields = [];
      const updateParams = [];

      if (title) { updateFields.push('title = ?'); updateParams.push(title); }
      if (description) { updateFields.push('description = ?'); updateParams.push(description); }
      if (long_description !== undefined) { updateFields.push('long_description = ?'); updateParams.push(long_description || null); }
      // Only update URL/Key if a new one was provided
      if (imageUrl !== undefined) { updateFields.push('image_url = ?'); updateParams.push(imageUrl || null); }
      if (imageKey !== undefined) { updateFields.push('image_key = ?'); updateParams.push(imageKey || null); }

      if (updateFields.length === 0) {
          return res.status(400).json({ message: 'No fields provided for update.' });
      }

      updateParams.push(serviceId); // For WHERE clause
      const updateQuery = `UPDATE services SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

      console.log('Executing DB Update:', updateQuery, updateParams);
      const [updateResult] = await pool.execute(updateQuery, updateParams);
      
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Service not found or no changes made.' });
      }
      console.log('Service updated successfully in DB.');
      
      // 3. Delete old image from UploadThing if replaced
      // Normalize both keys before comparison to ensure proper matching
      const normalizeKey = (key) => key ? key.trim() : null;
      const oldKey = normalizeKey(oldService.image_key);
      const newKey = normalizeKey(imageKey);
      
      const keyToDelete = (newKey !== undefined && oldKey && oldKey !== newKey) 
                          ? oldKey 
                          : null;

      if (keyToDelete) {
          console.log('Attempting to delete old image from UploadThing:', keyToDelete);
          try {
              // Use the direct helper function instead of API call
              const deleteResult = await deleteFile(keyToDelete);
              console.log('Direct file deletion result:', deleteResult);
              
              // Log warning only if there was an explicit failure
              if (!deleteResult.success) {
                  console.warn('Warning while deleting old image:', keyToDelete, deleteResult);
              }
          } catch (error) {
              console.error('Error deleting file:', error);
              // Log error but don't fail the request
          }
      }
      
      // 4. Fetch updated service
      const [updatedServiceData] = await pool.execute(
        'SELECT id, title, description, long_description, image_url, image_key, created_at, updated_at FROM services WHERE id = ?',
        [serviceId]
      );
      
      return res.status(200).json({
        message: 'Service updated successfully',
        service: updatedServiceData[0] || null
      });
    } catch (error) {
      console.error(`Update service ${serviceId} error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error updating service' });
    }
  } 
  // DELETE a service
  else if (req.method === 'DELETE') {
    // Admin authentication
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;
    
    try {
      console.log(`DELETE /api/services/${serviceId} request (admin)`);
      
      // 1. Get service key before deletion
      const [services] = await pool.execute(
        'SELECT image_key FROM services WHERE id = ?',
        [serviceId]
      );
      
      if (!services || services.length === 0) {
        return res.status(404).json({ message: 'Service not found for deletion.' });
      }
      
      // Normalize key for consistent handling
      const normalizeKey = (key) => key ? key.trim() : null;
      const keyToDelete = normalizeKey(services[0].image_key);
      
      // 2. Delete record from database
      const [deleteResult] = await pool.execute('DELETE FROM services WHERE id = ?', [serviceId]);
      
      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Service not found or already deleted.' });
      }
       console.log(`Service ${serviceId} deleted from DB.`);

      // 3. Delete image from UploadThing
      if (keyToDelete) {
          console.log('Attempting to delete image from UploadThing:', keyToDelete);
          try {
              // Use direct helper function 
              const deleteResult = await deleteFile(keyToDelete);
              console.log('File deletion result:', deleteResult);
              
              if (!deleteResult.success) {
                  console.warn('Warning while deleting service image:', keyToDelete, deleteResult);
              }
          } catch (error) {
              console.error('Error deleting file:', error);
              // Log error but don't fail request
          }
      }
      
      return res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
      console.error(`Delete service ${serviceId} error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error deleting service' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 