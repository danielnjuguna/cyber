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
    console.log(`🔍 File object for ${type}:`, file);
    
    // Check if file is an array (formidable v3+ structure)
    const fileObj = Array.isArray(file) ? file[0] : file;
    
    if (!fileObj || !fileObj.filepath) {
      console.error(`❌ Invalid file object for ${type}: missing filepath`);
      console.error('File object structure:', JSON.stringify(fileObj, null, 2));
      throw new Error(`Invalid file object for ${type}`);
    }
    
    console.log(`📁 Processing ${type} file:`, {
      originalName: fileObj.originalFilename,
      size: fileObj.size,
      mimeType: fileObj.mimetype,
      tempPath: fileObj.filepath
    });
    
    // Create directory if it doesn't exist
    const targetDir = path.join(uploadsDir, type === 'thumbnail' ? 'thumbnails' : 'documents');
    console.log(`🗂️ Ensuring directory exists: ${targetDir}`);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      console.log(`✅ Directory ready: ${targetDir}`);
    } catch (dirError) {
      console.error(`❌ Error creating directory: ${targetDir}`, dirError);
      throw new Error(`Failed to create directory for ${type}: ${dirError.message}`);
    }
    
    // Get original filename and sanitize it
    const originalName = fileObj.originalFilename 
      ? fileObj.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_') 
      : `${Date.now()}.${fileObj.mimetype?.split('/')[1] || 'file'}`;
    
    console.log(`📄 Original filename: ${fileObj.originalFilename}`);
    console.log(`📄 Sanitized filename: ${originalName}`);
            
    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${originalName}`;
    const targetPath = path.join(targetDir, uniqueFilename);
    console.log(`🔄 Target path for file: ${targetPath}`);
    
    // Check if temp file exists
    try {
      await fs.access(fileObj.filepath);
      console.log(`✅ Temp file exists: ${fileObj.filepath}`);
    } catch (accessError) {
      console.error(`❌ Temp file access error: ${fileObj.filepath}`, accessError);
      throw new Error(`Cannot access temp file for ${type}: ${accessError.message}`);
    }
    
    // Log file size before copying
    try {
      const stats = await fs.stat(fileObj.filepath);
      console.log(`📊 Temp file size: ${stats.size} bytes`);
      if (stats.size === 0) {
        console.warn(`⚠️ Warning: Temp file is empty (0 bytes)`);
      }
    } catch (statError) {
      console.error(`⚠️ Error getting file stats: ${fileObj.filepath}`, statError);
    }
    
    // Copy the file from the temp location to our uploads directory
    try {
      await fs.copyFile(fileObj.filepath, targetPath);
      console.log(`✅ File copied successfully from ${fileObj.filepath} to ${targetPath}`);
      
      // Verify the copied file
      const destStats = await fs.stat(targetPath);
      console.log(`📊 Destination file size: ${destStats.size} bytes`);
    } catch (copyError) {
      console.error(`❌ File copy error from ${fileObj.filepath} to ${targetPath}:`, copyError);
      throw new Error(`Failed to copy ${type} file: ${copyError.message}`);
    }
    
    // Return the path that will be stored in the database and used in URLs
    // Make sure to use / instead of \ for web URLs even on Windows
    const webPath = `/uploads/${type === 'thumbnail' ? 'thumbnails' : 'documents'}/${uniqueFilename}`;
    console.log(`🔗 Web path for file: ${webPath}`);
    return webPath;
  } catch (error) {
    console.error(`❌ File save error for ${type}:`, error);
    throw new Error(`Failed to save ${type}: ${error.message}`);
  }
}

// --- Helper to delete file locally ---
async function deleteFileLocally(filePath) {
  if (!filePath) {
    console.log('⚠️ No file path provided for deletion, skipping');
    return;
  }
  
  try {
    // Convert the URL path to a file system path
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
      console.log(`🔄 Normalized path for deletion: ${filePath}`);
    }
    
    // Create the full path to the file
    const fullPath = path.join(dirname(dirname(__dirname)), filePath);
    console.log(`🗑️ Attempting to delete file: ${fullPath}`);
    
    // Check if file exists before deleting
    try {
      await fs.access(fullPath);
      console.log(`✅ File exists and is accessible: ${fullPath}`);
      
      // Get file info before deletion
      try {
        const stats = await fs.stat(fullPath);
        console.log(`📊 File size before deletion: ${stats.size} bytes, Last modified: ${stats.mtime}`);
      } catch (statErr) {
        console.error(`⚠️ Could not get file stats before deletion: ${statErr.message}`);
      }
      
      // Actually delete the file
      await fs.unlink(fullPath);
      console.log(`✅ Successfully deleted file: ${fullPath}`);
      
      // Verify deletion
      try {
        await fs.access(fullPath);
        console.error(`⚠️ File still exists after deletion attempt: ${fullPath}`);
      } catch (verifyErr) {
        console.log(`✅ Verified file no longer exists: ${fullPath}`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`⚠️ File not found, no need to delete: ${fullPath}`);
      } else {
        console.error(`❌ Error accessing file for deletion: ${fullPath}`, err);
        throw err;
      }
    }
  } catch (deleteError) {
    console.error(`❌ Failed to delete file (${filePath}):`, deleteError);
    // Log error, but don't fail the main request
  }
}

// --- Main Handler ---
export default async function handler(req, res) {
  const { id: documentId } = req.query;

  if (!documentId || isNaN(parseInt(documentId))) {
    return res.status(400).json({ message: 'Invalid document ID' });
  }
  const targetDocumentId = parseInt(documentId);

  if (req.method === 'GET') {
    // --- Handle GET: Get document by ID (Public) ---
    try {
      console.log(`GET /api/documents/${targetDocumentId} request`);
      const [documents] = await pool.execute(
        'SELECT * FROM documents WHERE id = ?', [targetDocumentId]
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
      console.log('📦 Request body structure:', JSON.stringify(req.body, null, 2));
      console.log('📁 Request files structure:', Object.keys(req.files || {}));
      
      // Safety check - ensure req.body and req.files exist
      req.body = req.body || {};
      req.files = req.files || {};
      
      // Detailed log of files object
      if (req.files) {
        console.log('🔍 Files object structure:');
        for (const fileKey in req.files) {
          const fileObj = req.files[fileKey];
          if (Array.isArray(fileObj)) {
            console.log(`  ${fileKey}: [array] length ${fileObj.length}`);
            if (fileObj.length > 0) {
              const fileDetails = fileObj[0];
              console.log(`    - First file: ${fileDetails.originalFilename || 'unknown'}`);
              console.log(`      Size: ${fileDetails.size} bytes`);
              console.log(`      Type: ${fileDetails.mimetype || 'unknown'}`);
              console.log(`      Temp path: ${fileDetails.filepath || 'unknown'}`);
            }
          } else {
            console.log(`  ${fileKey}: [single object]`);
            console.log(`    - File: ${fileObj.originalFilename || 'unknown'}`);
            console.log(`      Size: ${fileObj.size} bytes`);
            console.log(`      Type: ${fileObj.mimetype || 'unknown'}`);
            console.log(`      Temp path: ${fileObj.filepath || 'unknown'}`);
          }
        }
      }
      
      // Extract form fields - formidable v3+ provides arrays for fields
      const title = req.body.title ? (Array.isArray(req.body.title) ? req.body.title[0] : req.body.title) : '';
      const description = req.body.description ? (Array.isArray(req.body.description) ? req.body.description[0] : req.body.description) : '';
      const preview_text = req.body.preview_text ? (Array.isArray(req.body.preview_text) ? req.body.preview_text[0] : req.body.preview_text) : null;
      const category = req.body.category ? (Array.isArray(req.body.category) ? req.body.category[0] : req.body.category) : 'other';
      
      console.log('📋 Extracted field values:');
      console.log(`  - Title: ${title}`);
      console.log(`  - Description: ${description?.substring(0, 50)}${description?.length > 50 ? '...' : ''}`);
      console.log(`  - Category: ${category}`);
      
      // Check if files object exists and has document/thumbnail properties
      const hasDocumentFile = req.files && req.files.document && Array.isArray(req.files.document) && req.files.document.length > 0;
      const hasThumbnailFile = req.files && req.files.thumbnail && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0;
      
      console.log('📁 File detection:');
      console.log(`  - Has document file: ${hasDocumentFile}`);
      console.log(`  - Has thumbnail file: ${hasThumbnailFile}`);
      
      // Validate required fields
      if (!title || !description) {
        console.log('❌ Validation failed: Missing title or description');
        return res.status(400).json({ message: 'Title and description are required.' });
      }

      // Get current document data
      console.log(`🔍 Getting existing document data for ID: ${targetDocumentId}`);
      const [currentDocs] = await pool.execute(
        'SELECT document_path, thumbnail_path FROM documents WHERE id = ?',
        [targetDocumentId]
      );
      
      if (!currentDocs || currentDocs.length === 0) {
        console.log(`❌ Document not found with ID: ${targetDocumentId}`);
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const oldDocPath = currentDocs[0].document_path;
      const oldThumbPath = currentDocs[0].thumbnail_path;
      console.log(`📄 Current document path: ${oldDocPath}`);
      console.log(`🖼️ Current thumbnail path: ${oldThumbPath}`);

      let newDocPath = oldDocPath;
      let newThumbPath = oldThumbPath;
      let docToDelete = null;
      let thumbToDelete = null;

      // Handle new document upload
      if (hasDocumentFile) {
        console.log('🔄 Uploading new document file...');
        try {
          newDocPath = await saveFileLocally(req.files.document, 'document');
          console.log(`✅ New document saved: ${newDocPath}`);
          docToDelete = oldDocPath; // Mark old doc path for deletion
          console.log(`🗑️ Marked old document for deletion: ${docToDelete}`);
        } catch (error) {
          console.error('❌ Document save error:', error);
          return res.status(500).json({ 
            message: error.message || 'Failed to save document file'
          });
        }
      } else {
        console.log('ℹ️ No new document file provided, keeping existing document');
      }

      // Handle new thumbnail upload
      if (hasThumbnailFile) {
        console.log('🔄 Uploading new thumbnail file...');
        try {
          newThumbPath = await saveFileLocally(req.files.thumbnail, 'thumbnail');
          console.log(`✅ New thumbnail saved: ${newThumbPath}`);
          thumbToDelete = oldThumbPath; // Mark old thumb path for deletion
          console.log(`🗑️ Marked old thumbnail for deletion: ${thumbToDelete}`);
        } catch (error) {
          console.error('⚠️ Thumbnail save failed, proceeding without it:', error.message);
          // Continue with the update even if thumbnail upload fails
        }
      } else {
        console.log('ℹ️ No new thumbnail file provided, keeping existing thumbnail');
      }

      // Update database
      console.log('🔄 Updating database with new values');
      console.log(`  - Title: ${title}`);
      console.log(`  - Document path: ${newDocPath}`);
      console.log(`  - Thumbnail path: ${newThumbPath}`);
      console.log(`  - Category: ${category}`);
      
      const [updateResult] = await pool.execute(
        'UPDATE documents SET title = ?, description = ?, document_path = ?, thumbnail_path = ?, preview_text = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
            title,
            description,
            newDocPath,
            newThumbPath,
            preview_text || null,
            category || 'other',
            targetDocumentId
        ]
      );

      if (updateResult.affectedRows === 0) {
        console.log(`❌ Update failed: No rows affected for ID ${targetDocumentId}`);
        return res.status(404).json({ message: 'Document not found during update.' });
      }
      
      console.log(`✅ Database update successful: ${updateResult.affectedRows} row(s) affected`);

      // Delete old files from local storage *after* DB update is successful
      if (docToDelete) {
        console.log(`🗑️ Deleting old document file: ${docToDelete}`);
        await deleteFileLocally(docToDelete);
      }
      if (thumbToDelete) {
        console.log(`🗑️ Deleting old thumbnail file: ${thumbToDelete}`);
        await deleteFileLocally(thumbToDelete);
      }

      // Fetch updated document
      console.log(`🔍 Fetching updated document data for ID: ${targetDocumentId}`);
      const [updatedDocData] = await pool.execute(
           'SELECT * FROM documents WHERE id = ?',
           [targetDocumentId]
      );
      
      console.log('✅ Update operation completed successfully');
      return res.status(200).json({
        message: 'Document updated successfully',
        document: updatedDocData[0] || null
      });

    } catch (error) {
      console.error(`❌ Update document ${targetDocumentId} error:`, error);
      if (error.sqlMessage) console.error('❌ SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error updating document' });
    }

  } else if (req.method === 'DELETE') {
    // --- Handle DELETE: Delete document (Admin Only) ---
    const authenticatedUser = await checkAdminAuth(req, res);
    if (!authenticatedUser) return;

    try {
      console.log(`DELETE /api/documents/${targetDocumentId} request (admin)`);
      // Get paths before deleting DB record
      const [docs] = await pool.execute(
        'SELECT document_path, thumbnail_path FROM documents WHERE id = ?',
        [targetDocumentId]
      );
      if (!docs || docs.length === 0) {
        return res.status(404).json({ message: 'Document not found' });
      }
      const docPathToDelete = docs[0].document_path;
      const thumbPathToDelete = docs[0].thumbnail_path;

      // Delete DB record
      const [deleteResult] = await pool.execute('DELETE FROM documents WHERE id = ?', [targetDocumentId]);

       if (deleteResult.affectedRows === 0) {
             return res.status(404).json({ message: 'Document not found or already deleted.' });
       }

      // Delete files from local storage *after* successful DB deletion
      if (docPathToDelete) await deleteFileLocally(docPathToDelete);
      if (thumbPathToDelete) await deleteFileLocally(thumbPathToDelete);

      return res.status(200).json({ message: 'Document deleted successfully' });

    } catch (error) {
      console.error(`Delete document ${targetDocumentId} error:`, error);
      return res.status(500).json({ message: 'Server error deleting document' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 