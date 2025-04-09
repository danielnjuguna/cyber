import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initDb, pool } from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import servicesRoutes from './routes/serviceRoutes.js';
import documentsRoutes from './routes/documentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import fs from 'fs';

// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directories if they don't exist (only in development)
const createUploadsDirectories = () => {
  // Skip in Vercel environment
  if (process.env.VERCEL) {
    console.log('Skipping directory creation in Vercel environment');
    return;
  }
  
  const directories = ['uploads', 'uploads/documents', 'uploads/thumbnails', 'uploads/images'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Initialize the database and set up middleware
const initializeApp = async () => {
  try {
    console.log('Starting database initialization...');
    await initDb();
    console.log('Database initialization complete!');
    
    // Create uploads directories (only in development)
    createUploadsDirectories();
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Static files - Fix path to point to the uploads dir in the project root
    // Original: app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use('/uploads', express.static('uploads'));
    
    // Routes
    app.use('/api/users', userRoutes);
    app.use('/api/services', servicesRoutes);
    app.use('/api/documents', documentsRoutes);
    app.use('/api/contact', contactRoutes);
    
    // Add specific route for document downloads
    app.get('/api/documents/:id/download', async (req, res) => {
      try {
        const { id } = req.params;
        const [documents] = await pool.execute(
          'SELECT document_path FROM documents WHERE id = ?',
          [id]
        );
        
        if (!documents || documents.length === 0) {
          return res.status(404).json({ message: 'Document not found' });
        }
        
        const documentPath = documents[0].document_path;
        if (!documentPath) {
          return res.status(404).json({ message: 'Document file not found' });
        }
        
        // Calculate the full path
        const fullPath = path.join(process.cwd(), documentPath.startsWith('/') ? documentPath.substring(1) : documentPath);
        return res.sendFile(fullPath);
      } catch (error) {
        console.error('Document download error:', error);
        return res.status(500).json({ message: 'Server error' });
      }
    });
    
    // Error handler middleware
    app.use((err, req, res, next) => {
      console.error('Global error handler:', err);
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
    
    // Health check route
    app.get('/health', (req, res) => {
      res.status(200).json({ message: 'Server is running' });
    });
    
    // Vercel-specific route for handling root path
    app.get('/api', (req, res) => {
      res.status(200).json({ message: 'API is running' });
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    return false;
  }
};

// Initialize the app
initializeApp();

// Only start the server if not running in Vercel
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
