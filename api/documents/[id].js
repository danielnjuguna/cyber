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
  const { id: documentId } = req.params;

  if (!documentId || isNaN(parseInt(documentId))) {
    return res.status(400).json({ message: 'Invalid document ID' });
  }
  const targetDocumentId = parseInt(documentId);

  if (req.method === 'GET') {
    // --- Handle GET: Get document by ID (Public) ---
    try {
      console.log(`GET /api/documents/${targetDocumentId} request`);
      // Select URL/Key columns
      const [documents] = await pool.execute(
        'SELECT id, title, description, category, document_url, document_key, document_path, thumbnail_url, thumbnail_key, file_type, created_at, updated_at FROM documents WHERE id = ?', 
        [targetDocumentId]
      );
      if (!documents || documents.length === 0) {
        return res.status(404).json({ message: 'Document not found' });
      }
      return res.status(200).json({ document: documents[0] });
    } catch (error) {
      console.error(`Get document ${targetDocumentId} error:`, error);
      return res.status(500).json({ message: 'Server error fetching document' });
    }

  } else if (req.method === 'PUT') {
    // --- Handle PUT: Update document (Admin Only) ---
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;

    try {
      console.log(`⚙️ PUT /api/documents/${targetDocumentId} request (admin)`);
      // Expecting JSON payload
      const { 
        title, 
        description, 
        category, 
        documentUrl, 
        documentKey, 
        thumbnailUrl, 
        thumbnailKey 
      } = req.body;

      console.log('Received payload for update:', req.body);

      // Basic validation
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required.' });
      }
       // If URL is present, key should be too
       if (documentUrl && !documentKey) return res.status(400).json({ message: 'Document Key is missing.' });
       if (thumbnailUrl && !thumbnailKey) return res.status(400).json({ message: 'Thumbnail Key is missing.' });

      // 1. Fetch current document data (including old keys) before update
      const [currentDocs] = await pool.execute(
        'SELECT document_key, thumbnail_key FROM documents WHERE id = ?', 
        [targetDocumentId]
      );

      if (!currentDocs || currentDocs.length === 0) {
        return res.status(404).json({ message: 'Document not found for update.' });
      }
      const oldDoc = currentDocs[0];
      console.log('Old keys:', oldDoc);

      // 2. Update database record with new data (including potentially new URLs/Keys)
      const updateFields = [];
      const updateParams = [];

      if (title) { updateFields.push('title = ?'); updateParams.push(title); }
      if (description) { updateFields.push('description = ?'); updateParams.push(description); }
      if (category) { updateFields.push('category = ?'); updateParams.push(category); }
      // Only update URL/Key if a new one was provided in the payload
      if (documentUrl !== undefined) { 
        updateFields.push('document_url = ?'); 
        updateParams.push(documentUrl || null);
        // Also update document_path with the same value
        updateFields.push('document_path = ?'); 
        updateParams.push(documentUrl || null);
      }
      if (documentKey !== undefined) { updateFields.push('document_key = ?'); updateParams.push(documentKey || null); }
      if (thumbnailUrl !== undefined) { updateFields.push('thumbnail_url = ?'); updateParams.push(thumbnailUrl || null); }
      if (thumbnailKey !== undefined) { updateFields.push('thumbnail_key = ?'); updateParams.push(thumbnailKey || null); }
      
      if (updateFields.length === 0) {
          return res.status(400).json({ message: 'No fields provided for update.' });
      }

      updateParams.push(targetDocumentId); // For the WHERE clause
      const updateQuery = `UPDATE documents SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      console.log('Executing DB Update:', updateQuery, updateParams);
      const [updateResult] = await pool.execute(updateQuery, updateParams);

      if (updateResult.affectedRows === 0) {
          return res.status(404).json({ message: 'Document not found or no changes made.' });
      }
      console.log('Document updated successfully in DB.');

      // 3. Delete old files from UploadThing if new ones were uploaded
      const keysToDelete = [];
      
      // Normalize keys before comparison
      const normalizeKey = (key) => key ? key.trim() : null;
      const oldDocKey = normalizeKey(oldDoc.document_key);
      const oldThumbKey = normalizeKey(oldDoc.thumbnail_key);
      const newDocKey = normalizeKey(documentKey);
      const newThumbKey = normalizeKey(thumbnailKey);
      
      if (newDocKey !== undefined && oldDocKey && oldDocKey !== newDocKey) {
          keysToDelete.push(oldDocKey);
      }
      if (newThumbKey !== undefined && oldThumbKey && oldThumbKey !== newThumbKey) {
          keysToDelete.push(oldThumbKey);
      }

      if (keysToDelete.length > 0) {
          console.log('Attempting to delete files from UploadThing:', keysToDelete);
          
          // Process each key sequentially using the direct helper function
          for (const fileKey of keysToDelete) {
              try {
                  // Use our direct helper function
                  const deleteResult = await deleteFile(fileKey);
                  console.log(`Delete result for file ${fileKey}:`, deleteResult);
                  
                  // Log warning only if there was an explicit failure
                  if (!deleteResult.success) {
                      console.warn(`Warning while deleting document file ${fileKey}:`, deleteResult);
                  }
              } catch (error) {
                  console.error(`Error deleting file ${fileKey}:`, error);
                  // Log error but don't fail the request
              }
          }
      }
      
      // 4. Fetch updated document data to return
      const [updatedDocumentData] = await pool.execute(
        'SELECT id, title, description, category, document_url, document_key, document_path, thumbnail_url, thumbnail_key, created_at, updated_at FROM documents WHERE id = ?', 
        [targetDocumentId]
      );

      return res.status(200).json({
        message: 'Document updated successfully',
        document: updatedDocumentData[0] || null
      });

    } catch (error) {
      console.error(`Update document ${targetDocumentId} error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error updating document' });
    }

  } else if (req.method === 'DELETE') {
    // --- Handle DELETE: Delete document (Admin Only) ---
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;

    try {
      console.log(`DELETE /api/documents/${targetDocumentId} request (admin)`);

      // 1. Fetch document keys before deleting DB record
      const [currentDocs] = await pool.execute(
        'SELECT document_key, thumbnail_key FROM documents WHERE id = ?', 
        [targetDocumentId]
      );

      if (!currentDocs || currentDocs.length === 0) {
        return res.status(404).json({ message: 'Document not found for deletion.' });
      }
      const docToDelete = currentDocs[0];
      const keysToDelete = [];
      
      // Normalize keys for consistent handling
      const normalizeKey = (key) => key ? key.trim() : null;
      const docKey = normalizeKey(docToDelete.document_key);
      const thumbKey = normalizeKey(docToDelete.thumbnail_key);
      
      if (docKey) keysToDelete.push(docKey);
      if (thumbKey) keysToDelete.push(thumbKey);
      
      // 2. Delete the database record
      const [deleteResult] = await pool.execute(
        'DELETE FROM documents WHERE id = ?',
        [targetDocumentId]
      );

      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Document not found or already deleted.' });
      }
      console.log(`Document ${targetDocumentId} deleted from DB.`);

      // 3. Delete files from UploadThing
      if (keysToDelete.length > 0) {
          console.log('Attempting to delete files from UploadThing:', keysToDelete);
          
          // Process each key sequentially using the direct helper function
          for (const fileKey of keysToDelete) {
              try {
                  // Use our direct helper function
                  const deleteResult = await deleteFile(fileKey);
                  console.log(`Delete result for file ${fileKey}:`, deleteResult);
                  
                  // Log warning only if there was an explicit failure
                  if (!deleteResult.success) {
                      console.warn(`Warning while deleting document file ${fileKey}:`, deleteResult);
                  }
              } catch (error) {
                  console.error(`Error deleting file ${fileKey}:`, error);
                  // Log error but don't fail the request
              }
          }
      }

      return res.status(200).json({ message: 'Document deleted successfully' });

    } catch (error) {
      console.error(`Delete document ${targetDocumentId} error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error deleting document' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 