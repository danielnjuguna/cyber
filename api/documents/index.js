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
    const targetDir = path.join(uploadsDir, type === 'thumbnail' ? 'thumbnails' : 'documents');
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
    const webPath = `/uploads/${type === 'thumbnail' ? 'thumbnails' : 'documents'}/${uniqueFilename}`;
    console.log(`Web path for file: ${webPath}`);
    return webPath;
  } catch (error) {
    console.error(`File save error for ${type}:`, error);
    throw new Error(`Failed to save ${type}: ${error.message}`);
  }
}

// --- Main Handler ---
export default async function handler(req, res) {

  if (req.method === 'GET') {
    // --- Handle GET: Get all documents (Public, with filter/search) ---
    try {
      console.log('GET /api/documents request', req.query);
      let query = 'SELECT id, title, description, document_path, thumbnail_path, preview_text, category, created_at, updated_at FROM documents';
      const params = [];
      const conditions = [];

      // Filter by category
      if (req.query.category && req.query.category !== 'all') {
        conditions.push('category = ?');
        params.push(req.query.category);
      }

      // Search by title or description
      if (req.query.search) {
        const searchTerm = `%${req.query.search}%`;
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC'; // Default sort order

      const [documents] = await pool.execute(query, params);
      return res.status(200).json({ documents });

    } catch (error) {
      console.error('Get all documents error:', error);
      return res.status(500).json({ message: 'Server error fetching documents' });
    }

  } else if (req.method === 'POST') {
    // --- Handle POST: Create new document (Admin Only) ---

    // Check Admin Auth FIRST
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;

    try {
      console.log('POST /api/documents request (admin)');
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      
      // Extract form fields - formidable v3+ provides arrays for fields
      const title = Array.isArray(req.body.title) ? req.body.title[0] : req.body.title;
      const description = Array.isArray(req.body.description) ? req.body.description[0] : req.body.description;
      const preview_text = Array.isArray(req.body.preview_text) ? req.body.preview_text[0] : req.body.preview_text;
      const category = Array.isArray(req.body.category) ? req.body.category[0] : req.body.category;
      
      // Extract files - formidable structure is different than expected
      const documentFile = req.files.document; // In formidable v3+, this is an array
      const thumbnailFile = req.files.thumbnail;

      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required.' });
      }
      
      if (!documentFile || !documentFile.length) {
          return res.status(400).json({ message: 'Document file is required.' });
      }

      let documentPath = null;
      let thumbnailPath = null;

      // Upload document file - now saving locally
      try {
        documentPath = await saveFileLocally(documentFile, 'document');
      } catch (error) {
          return res.status(500).json({ message: error.message || 'Failed to save document.' });
      }

      // Upload thumbnail file if present - now saving locally
      if (thumbnailFile && thumbnailFile.length) {
          try {
              thumbnailPath = await saveFileLocally(thumbnailFile, 'thumbnail');
          } catch (error) {
              console.error('Thumbnail save failed, proceeding without it:', error.message);
          }
      }

      // Save document details to the database
      const [result] = await pool.execute(
        'INSERT INTO documents (title, description, document_path, thumbnail_path, preview_text, category) VALUES (?, ?, ?, ?, ?, ?)',
        [
            title,
            description,
            documentPath, // The local file path
            thumbnailPath, // The local file path or null
            preview_text || null,
            category || 'other' // Default category
        ]
      );

      const newDocumentId = result.insertId;

      // Fetch the created document to return it
      const [newDocumentData] = await pool.execute(
        'SELECT * FROM documents WHERE id = ?',
        [newDocumentId]
      );

      return res.status(201).json({
        message: 'Document created successfully',
        document: newDocumentData[0] || null
      });

    } catch (error) {
      console.error('Create document error:', error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error creating document' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 