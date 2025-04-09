import { pool } from '../config/db.js';
import fs from 'fs';

// Get all documents
export const getAllDocuments = async (req, res) => {
  try {
    let query = 'SELECT id, title, description, document_path, thumbnail_path, preview_text, category, created_at, updated_at FROM documents';
    const params = [];
    
    // Filter by category if provided
    if (req.query.category && req.query.category !== 'all') {
      query += ' WHERE category = ?';
      params.push(req.query.category);
    }

    // Search by title or description if provided
    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      if (params.length > 0) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
      } else {
        query += ' WHERE (title LIKE ? OR description LIKE ?)';
      }
      params.push(searchTerm, searchTerm);
    }

    const [documents] = await pool.execute(query, params);

    res.status(200).json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
  const { id } = req.params;

  try {
    const [documents] = await pool.execute(
      'SELECT id, title, description, document_path, thumbnail_path, preview_text, category, created_at, updated_at FROM documents WHERE id = ?',
      [id]
    );

    if (!Array.isArray(documents) || documents.length === 0) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    res.status(200).json({ document: documents[0] });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new document
export const createDocument = async (req, res) => {
  try {
    const { title, description, preview_text, category } = req.body;
    let documentPath = null;
    let thumbnailPath = null;

    // Check if document file was uploaded
    if (req.files && req.files.document && req.files.document[0]) {
      documentPath = `/uploads/documents/${req.files.document[0].filename}`;
    } else if (req.file) {
      // For single file upload configuration
      documentPath = `/uploads/documents/${req.file.filename}`;
    } else {
      res.status(400).json({ message: 'Document file is required' });
      return;
    }

    // Check if thumbnail was uploaded
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }

    const [result] = await pool.execute(
      'INSERT INTO documents (title, description, document_path, thumbnail_path, preview_text, category) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, documentPath, thumbnailPath, preview_text || null, category || null]
    );

    res.status(201).json({
      message: 'Document created successfully',
      document: {
        id: result.insertId,
        title,
        description,
        document_path: documentPath,
        thumbnail_path: thumbnailPath,
        preview_text,
        category: category || null
      }
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update document
export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title, description, preview_text, category } = req.body;

  try {
    // Get current document data
    const [documents] = await pool.execute(
      'SELECT document_path, thumbnail_path FROM documents WHERE id = ?',
      [id]
    );

    if (!Array.isArray(documents) || documents.length === 0) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    let documentPath = documents[0].document_path;
    let thumbnailPath = documents[0].thumbnail_path;

    // If new document was uploaded
    if (req.files && req.files.document && req.files.document[0]) {
      // Delete old document if exists
      if (documentPath && fs.existsSync(`.${documentPath}`)) {
        fs.unlinkSync(`.${documentPath}`);
      }
      
      documentPath = `/uploads/documents/${req.files.document[0].filename}`;
    } else if (req.file) {
      // For single file upload configuration
      if (documentPath && fs.existsSync(`.${documentPath}`)) {
        fs.unlinkSync(`.${documentPath}`);
      }
      
      documentPath = `/uploads/documents/${req.file.filename}`;
    }

    // If new thumbnail was uploaded
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      // Delete old thumbnail if exists
      if (thumbnailPath && fs.existsSync(`.${thumbnailPath}`)) {
        fs.unlinkSync(`.${thumbnailPath}`);
      }
      
      thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }

    // Update document
    await pool.execute(
      'UPDATE documents SET title = ?, description = ?, document_path = ?, thumbnail_path = ?, preview_text = ?, category = ? WHERE id = ?',
      [title, description, documentPath, thumbnailPath, preview_text || null, category || null, id]
    );

    res.status(200).json({
      message: 'Document updated successfully',
      document: {
        id,
        title,
        description,
        document_path: documentPath,
        thumbnail_path: thumbnailPath,
        preview_text,
        category: category || null
      }
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  const { id } = req.params;

  try {
    // Get current document data to delete files
    const [documents] = await pool.execute(
      'SELECT document_path, thumbnail_path FROM documents WHERE id = ?',
      [id]
    );

    if (!Array.isArray(documents) || documents.length === 0) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    // Delete document file if exists
    const documentPath = documents[0].document_path;
    if (documentPath && fs.existsSync(`.${documentPath}`)) {
      fs.unlinkSync(`.${documentPath}`);
    }

    // Delete thumbnail if exists
    const thumbnailPath = documents[0].thumbnail_path;
    if (thumbnailPath && fs.existsSync(`.${thumbnailPath}`)) {
      fs.unlinkSync(`.${thumbnailPath}`);
    }

    // Delete document record
    await pool.execute('DELETE FROM documents WHERE id = ?', [id]);

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
