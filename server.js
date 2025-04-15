import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Formidable middleware for file uploads - update to handle both document routes
app.use('/api/documents', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Check if this is actually a multipart form
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      // Not a multipart form, skip formidable parsing
      console.log('Not parsing as multipart: content-type is', contentType);
      return next();
    }
    
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: true, // Allow multiple files
      allowEmptyFiles: true, // Allow empty files
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        // Check if the error is related to empty forms
        if (err.code === 1012 && err.httpCode === 400) {
          // This is likely a form with no files, proceed with empty files
          req.body = req.body || {};
          req.files = {};
          return next();
        }
        return res.status(500).json({ message: 'Error parsing form data' });
      }
      
      // Attach parsed data to request object
      req.body = fields;
      req.files = files;
      next();
    });
  } else {
    next();
  }
});

// Also handle PUT requests to /api/documents/:id
// app.use('/api/documents/:id', (req, res, next) => {
//   if (req.method === 'POST' || req.method === 'PUT') {
//     // Check if this is actually a multipart form
//     const contentType = req.headers['content-type'] || '';
//     if (!contentType.includes('multipart/form-data')) {
//       // Not a multipart form, skip formidable parsing
//       console.log('Not parsing as multipart: content-type is', contentType);
//       return next();
//     }
//     
//     const form = formidable({
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // 10MB limit
//       multiples: true, // Allow multiple files
//       allowEmptyFiles: true, // Allow empty files
//     });
//     
//     form.parse(req, (err, fields, files) => {
//       if (err) {
//         console.error('Form parsing error:', err);
//         // Check if the error is related to empty forms
//         if (err.code === 1012 && err.httpCode === 400) {
//           // This is likely a form with no files, proceed with empty files
//           req.body = req.body || {};
//           req.files = {};
//           return next();
//         }
//         return res.status(500).json({ message: 'Error parsing form data' });
//       }
//       
//       // Attach parsed data to request object
//       req.body = fields;
//       req.files = files;
//       next();
//     });
//   } else {
//     next();
//   }
// });

app.use('/api/services', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Check if this is actually a multipart form
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      // Not a multipart form, skip formidable parsing
      console.log('Not parsing as multipart: content-type is', contentType);
      return next();
    }
    
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: true, // Allow multiple files
      allowEmptyFiles: true, // Allow empty files
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        // Check if the error is related to empty forms
        if (err.code === 1012 && err.httpCode === 400) {
          // This is likely a form with no files, proceed with empty files
          req.body = req.body || {};
          req.files = {};
          return next();
        }
        return res.status(500).json({ message: 'Error parsing form data' });
      }
      
      // Attach parsed data to request object
      req.body = fields;
      req.files = files;
      next();
    });
  } else {
    next();
  }
});

// Serve static files from uploads directory with better error handling
app.use('/uploads', (req, res, next) => {
  console.log(`Serving static file: ${req.url}`);
  next();
}, express.static(join(__dirname, 'uploads'), {
  fallthrough: true,
  setHeaders: (res, path) => {
    console.log(`Setting headers for: ${path}`);
    // Set appropriate content type for images
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (path.endsWith('.doc') || path.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/msword');
    }
  }
}));

// Add a second static path for absolute uploads path to handle path issues
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Log requests to help with debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Import API routes
const importRoute = async (path) => {
  const module = await import(path);
  return module.default;
};

// Setup API routes
const setupRoutes = async () => {
  // Import standard handlers
  const servicesHandler = await importRoute('./api/services/index.js');
  const servicesIdHandler = await importRoute('./api/services/[id].js');
  const documentsHandler = await importRoute('./api/documents/index.js');
  const documentsIdHandler = await importRoute('./api/documents/[id].js');
  const usersHandler = await importRoute('./api/users/index.js');
  const usersIdHandler = await importRoute('./api/users/[id].js');
  const contactHandler = await importRoute('./api/contact/index.js');

  // Import authentication handlers
  const loginHandler = await importRoute('./api/users/login.js');
  const registerHandler = await importRoute('./api/users/register.js');
  const profileHandler = await importRoute('./api/users/profile.js');
  const requestResetHandler = await importRoute('./api/users/request-reset.js');
  const resetPasswordHandler = await importRoute('./api/users/reset-password.js');

  // Convert serverless functions to Express middleware
  const toExpressHandler = (handler) => async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  };

  // Parse ID from URL and attach to req.query
  const parseIdParam = (req, res, next) => {
    const parts = req.url.split('/');
    const id = parts[parts.length - 1];
    if (id && !isNaN(parseInt(id))) {
      req.query.id = id;
    }
    next();
  };

  // Mount authentication routes (These should generally be public or have their own specific auth)
  app.post('/api/users/login', toExpressHandler(loginHandler));
  app.post('/api/users/register', toExpressHandler(registerHandler));
  app.get('/api/users/profile', toExpressHandler(profileHandler)); // Profile might need auth inside handler
  app.post('/api/users/request-reset', toExpressHandler(requestResetHandler));
  app.post('/api/users/reset-password', toExpressHandler(resetPasswordHandler));

  // Mount other resource routes (These often need admin auth)
  app.all('/api/services/:id', parseIdParam, toExpressHandler(servicesIdHandler));
  app.all('/api/services', toExpressHandler(servicesHandler));
  
  app.all('/api/documents/:id', parseIdParam, toExpressHandler(documentsIdHandler));
  app.all('/api/documents', toExpressHandler(documentsHandler));
  
  // Note: /api/users and /api/users/:id are handled by usersHandler/usersIdHandler
  // which *do* include admin checks internally
  app.all('/api/users/:id', parseIdParam, toExpressHandler(usersIdHandler));
  app.all('/api/users', toExpressHandler(usersHandler));
  
  app.all('/api/contact', toExpressHandler(contactHandler));

  // Add a test route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });
};

// Create required directories if they don't exist
const createUploadDirectories = async () => {
  try {
    // Create main uploads directory
    const uploadsDir = join(__dirname, 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`Created or verified uploads directory: ${uploadsDir}`);
    
    // Create subdirectories
    const dirs = ['documents', 'thumbnails', 'services'];
    for (const dir of dirs) {
      const dirPath = join(uploadsDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Created or verified directory: ${dirPath}`);
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// --- Serve Static Frontend Files (Added for Render deployment) ---
// Serve the built Vite assets from the 'dist' directory
app.use(express.static(join(__dirname, 'dist')));

// --- Catch-all Route (Added for Render deployment) ---
// For any request that doesn't match an API route or a static file,
// serve the index.html. This is crucial for React Router.
app.get('*', (req, res) => {
  // Avoid sending HTML for API-like paths that weren't matched explicitly
  if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/uploads/')) {
     return res.status(404).json({ message: 'Resource not found' });
  }
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
const startServer = async () => {
  try {
    // Create upload directories
    await createUploadDirectories();
    
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Server will not start.');
      process.exit(1);
    }

    // Setup routes
    await setupRoutes();

    // Start listening - Modified for Render
    app.listen(port, '0.0.0.0', () => { // Listen on 0.0.0.0
      console.log(`Server running on port ${port}`); // Updated log message
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 