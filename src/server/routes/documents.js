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
    // Determine correct directory based on file type
    const destination = file.fieldname === 'document' 
      ? 'src/server/uploads/documents' 
      : 'src/server/uploads/thumbnails';
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'document') {
      // Allow common document formats
      const filetypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }
      
      cb(new Error('Only document files are allowed'));
    } else if (file.fieldname === 'thumbnail') {
      // Allow common image formats for thumbnails
      const filetypes = /jpeg|jpg|png|gif|webp/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return cb(null, true);
      }
      
      cb(new Error('Only image files are allowed for thumbnails'));
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// Fields to upload both document and thumbnail
const uploadFields = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Get all documents - public route
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM documents';
    const queryParams = [];
    
    // Handle category filters
    if (req.query.category) {
      query += ' WHERE category = ?';
      queryParams.push(req.query.category);
    }
    
    // Handle search
    if (req.query.search) {
      query += queryParams.length ? ' AND' : ' WHERE';
      query += ' (title LIKE ? OR description LIKE ?)';
      queryParams.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, queryParams);
    
    res.json({ documents: rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single document - public route
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json({ document: rows[0] });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new document - admin only
router.post('/', adminAuth, uploadFields, async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: 'Document file is required' });
    }
    
    // Prepare paths
    const document_path = `/uploads/documents/${req.files.document[0].filename}`;
    const thumbnail_path = req.files.thumbnail 
      ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}` 
      : null;
    
    const [result] = await pool.execute(
      'INSERT INTO documents (title, description, category, document_path, thumbnail_path) VALUES (?, ?, ?, ?, ?)',
      [title, description, category || 'other', document_path, thumbnail_path]
    );
    
    // Get the newly created document
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Document created successfully',
      document: rows[0]
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update document - admin only
router.put('/:id', adminAuth, uploadFields, async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const { id } = req.params;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Check if document exists
    const [existingDocument] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    
    if (existingDocument.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Prepare paths
    const document_path = req.files && req.files.document 
      ? `/uploads/documents/${req.files.document[0].filename}` 
      : existingDocument[0].document_path;
    
    const thumbnail_path = req.files && req.files.thumbnail 
      ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}` 
      : existingDocument[0].thumbnail_path;
    
    await pool.execute(
      'UPDATE documents SET title = ?, description = ?, category = ?, document_path = ?, thumbnail_path = ?, updated_at = NOW() WHERE id = ?',
      [title, description, category || 'other', document_path, thumbnail_path, id]
    );
    
    // Get the updated document
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    
    res.json({ 
      message: 'Document updated successfully',
      document: rows[0]
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete document - admin only
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if document exists
    const [existingDocument] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    
    if (existingDocument.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    await pool.execute(
      'DELETE FROM documents WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 