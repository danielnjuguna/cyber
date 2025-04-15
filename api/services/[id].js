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

// --- Helper to delete file locally ---
async function deleteFileLocally(filePath) {
  if (!filePath) return; // Nothing to delete
  
  try {
    // Convert the URL path to a file system path
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Create the full path to the file
    const fullPath = path.join(dirname(dirname(__dirname)), filePath);
    console.log(`Attempting to delete file: ${fullPath}`);
    
    // Check if file exists before deleting
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      console.log(`Successfully deleted file: ${fullPath}`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`File not found, no need to delete: ${fullPath}`);
      } else {
        throw err;
      }
    }
  } catch (deleteError) {
    console.error(`Failed to delete file (${filePath}):`, deleteError);
    // Log error, but don't fail the main request
  }
}

// --- Main Handler ---
export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: 'Invalid service ID' });
  }
  
  const serviceId = parseInt(id);

  // GET service by ID
  if (req.method === 'GET') {
    try {
      console.log(`GET /api/services/${serviceId} request`);
      const [services] = await pool.execute(
        'SELECT * FROM services WHERE id = ?', 
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
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      
      // Extract form fields
      const title = Array.isArray(req.body.title) ? req.body.title[0] : req.body.title;
      const description = Array.isArray(req.body.description) ? req.body.description[0] : req.body.description;
      const longDescription = Array.isArray(req.body.long_description) ? req.body.long_description[0] : req.body.long_description;
      
      // Check if files object exists and has image property
      const hasImageFile = req.files && req.files.image && Array.isArray(req.files.image) && req.files.image.length > 0;
      
      console.log('Has image file?', hasImageFile);
      
      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      
      // Get current service data
      const [currentServices] = await pool.execute(
        'SELECT image_path FROM services WHERE id = ?',
        [serviceId]
      );
      
      if (!currentServices || currentServices.length === 0) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      const oldImagePath = currentServices[0].image_path;
      let newImagePath = oldImagePath;
      let imageToDelete = null;
      
      // Handle new image upload if provided
      if (hasImageFile) {
        try {
          newImagePath = await saveFileLocally(req.files.image, 'image');
          imageToDelete = oldImagePath; // Mark old image for deletion
        } catch (error) {
          return res.status(500).json({ 
            message: error.message || 'Failed to save image file'
          });
        }
      }
      
      // Update database with correct schema fields
      const [updateResult] = await pool.execute(
        'UPDATE services SET title = ?, description = ?, long_description = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          title,
          description,
          longDescription || null,
          newImagePath,
          serviceId
        ]
      );
      
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Service not found during update' });
      }
      
      // Delete old image file if replaced
      if (imageToDelete) {
        await deleteFileLocally(imageToDelete);
      }
      
      // Fetch updated service
      const [updatedServiceData] = await pool.execute(
        'SELECT * FROM services WHERE id = ?',
        [serviceId]
      );
      
      return res.status(200).json({
        message: 'Service updated successfully',
        service: updatedServiceData[0] || null
      });
    } catch (error) {
      console.error(`Update service ${serviceId} error:`, error);
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
      
      // Get service data to retrieve file path before deletion
      const [services] = await pool.execute(
        'SELECT image_path FROM services WHERE id = ?',
        [serviceId]
      );
      
      if (!services || services.length === 0) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      const imagePathToDelete = services[0].image_path;
      
      // Delete record from database
      const [deleteResult] = await pool.execute(
        'DELETE FROM services WHERE id = ?', 
        [serviceId]
      );
      
      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Service not found or already deleted' });
      }
      
      // Delete image file if exists
      if (imagePathToDelete) {
        await deleteFileLocally(imagePathToDelete);
      }
      
      return res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
      console.error(`Delete service ${serviceId} error:`, error);
      return res.status(500).json({ message: 'Server error deleting service' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 