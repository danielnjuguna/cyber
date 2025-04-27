import jwt from 'jsonwebtoken';
import { pool } from '../../lib/db.js';

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

// --- Main Handler ---
export default async function handler(req, res) {

  if (req.method === 'GET') {
    // --- Handle GET: Get all documents (Public, with filter/search) ---
    try {
      console.log('GET /api/documents request', req.query);
      let query = 'SELECT id, title, description, document_url, document_key, document_path, thumbnail_url, thumbnail_key, category, created_at, updated_at FROM documents';
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
      // Expecting JSON payload now
      const { 
        title, 
        description, 
        category, 
        documentUrl, 
        documentKey, 
        thumbnailUrl, 
        thumbnailKey 
      } = req.body;

      console.log('Received payload:', req.body);

      // Basic validation
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required.' });
      }
      if (!documentUrl || !documentKey) {
         return res.status(400).json({ message: 'Document URL and Key are required.' });
      }
      // Thumbnail is optional, but if URL is present, Key should be too (usually)
       if (thumbnailUrl && !thumbnailKey) {
         console.warn('Thumbnail URL provided but Key is missing. Proceeding, but this might indicate an issue.');
       }

      // Save document details to the database with URLs and Keys
      // Added document_path to match database schema requirements
      const [result] = await pool.execute(
        'INSERT INTO documents (title, description, category, document_url, document_key, document_path, thumbnail_url, thumbnail_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
            title,
            description,
            category || 'other', // Default category
            documentUrl,
            documentKey,
            documentUrl, // Set document_path to same value as documentUrl
            thumbnailUrl || null, // Store null if no thumbnail provided
            thumbnailKey || null
        ]
      );

      const newDocumentId = result.insertId;
      console.log(`Document created with ID: ${newDocumentId}`);

      // Fetch the created document to return it
      const [newDocumentData] = await pool.execute(
        // Include document_path in the selection
        'SELECT id, title, description, category, document_url, document_key, document_path, thumbnail_url, thumbnail_key, created_at, updated_at FROM documents WHERE id = ?',
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