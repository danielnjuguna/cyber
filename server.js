import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Get the port from environment variables - Render sets this automatically
const port = process.env.PORT || 5000;
console.log(`Using port: ${port} from environment variable: ${process.env.PORT || 'fallback 5000'}`);

// Middleware
// Add explicit CORS configuration for Render
app.use(cors({
  origin: '*', // For production, you should specify allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Add fallback middleware for missing images
app.use('/uploads/:type/:filename', (req, res, next) => {
  const { type, filename } = req.params;
  const filePath = join(__dirname, 'uploads', type, filename);
  
  console.log(`Checking file path: ${filePath}`);
  if (existsSync(filePath)) {
    // File exists, let the static middleware handle it
    return next();
  }
  
  console.log(`File not found: ${filePath}, returning placeholder`);
  
  // Serve placeholder based on file type
  if (type === 'thumbnails') {
    // Serve a placeholder thumbnail
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(join(__dirname, 'public', 'placeholder-thumbnail.png'));
  } else if (type === 'services') {
    // Serve a placeholder service image
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(join(__dirname, 'public', 'placeholder-service.jpg'));
  } else if (type === 'documents') {
    // For documents, just return a 404 as we can't create placeholders for documents
    res.status(404).json({ error: 'Document not found' });
  } else {
    // For unknown types, continue to the next handler
    next();
  }
});

// Serve static files from uploads directory with better error handling
app.use('/uploads', (req, res, next) => {
  console.log(`Serving static file from uploads: ${req.url}`);
  // Try to resolve the file explicitly
  const filePath = join(__dirname, 'uploads', req.url);
  if (existsSync(filePath)) {
    console.log(`File exists at: ${filePath}`);
  } else {
    console.log(`File does not exist at: ${filePath}, trying fallback`);
  }
  next();
}, express.static(join(__dirname, 'uploads'), {
  fallthrough: true,
  maxAge: '1d',
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
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Add a second static path with absolute path to handle path issues
const absoluteUploadsPath = path.resolve(__dirname, 'uploads');
console.log(`Setting up absolute uploads path: ${absoluteUploadsPath}`);
app.use('/uploads', express.static(absoluteUploadsPath, {
  fallthrough: true,
  maxAge: '1d'
}));

// Special handler for thumbnails
app.use('/uploads/thumbnails', express.static(join(__dirname, 'uploads', 'thumbnails'), {
  fallthrough: true,
  maxAge: '1d',
  setHeaders: (res, path) => {
    console.log(`Setting headers for thumbnail: ${path}`);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Special handler for service images
app.use('/uploads/services', express.static(join(__dirname, 'uploads', 'services'), {
  fallthrough: true,
  maxAge: '1d',
  setHeaders: (res, path) => {
    console.log(`Setting headers for service image: ${path}`);
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Also add a direct route handler for the specific problematic files
app.get('/uploads/thumbnails/1744737374510-passport.png', (req, res) => {
  const filePath = join(__dirname, 'uploads', 'thumbnails', '1744737374510-passport.png');
  console.log(`Direct file request for ${filePath}, exists: ${existsSync(filePath)}`);
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.log('File not found');
    res.status(404).send('File not found');
  }
});

app.get('/uploads/services/1744737252857-AIDE_2.jpg', (req, res) => {
  const filePath = join(__dirname, 'uploads', 'services', '1744737252857-AIDE_2.jpg');
  console.log(`Direct file request for ${filePath}, exists: ${existsSync(filePath)}`);
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.log('File not found');
    res.status(404).send('File not found');
  }
});

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
    console.log('Health check endpoint hit');
    res.json({ status: 'ok', message: 'Server is running', environment: process.env.NODE_ENV });
  });

  // Add a root path handler
  app.get('/', (req, res) => {
    console.log('Root path hit');
    if (existsSync(join(__dirname, 'dist', 'index.html'))) {
      res.sendFile(join(__dirname, 'dist', 'index.html'));
    } else {
      res.json({ 
        status: 'ok', 
        message: 'CyberDocs API is running',
        dist_exists: existsSync(join(__dirname, 'dist')),
        env: process.env.NODE_ENV
      });
    }
  });
  
  // Add global error handler for API routes - moved here after routes are registered
  app.use('/api', (req, res, next) => {
    res.on('error', (err) => {
      console.error(`Response error on ${req.method} ${req.url}:`, err);
    });
    next();
  });

  // Add a fallback for database errors in API routes
  app.use('/api', async (req, res, next) => {
    req.dbErrorHandled = false;
    
    // Create a failsafe timeout to prevent hanging requests
    const apiTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`API request timeout for ${req.method} ${req.url}`);
        res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Request timed out. Please try again later.',
          path: req.originalUrl
        });
      }
    }, 15000); // 15 second timeout
    
    // Clean up the timeout when the response is sent
    res.on('finish', () => {
      clearTimeout(apiTimeout);
    });
    
    next();
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
    
    // Also check if any of the problematic files already exist from previous deploys
    const filesToCheck = [
      join(uploadsDir, 'thumbnails', '1744737374510-passport.png'),
      join(uploadsDir, 'services', '1744737252857-AIDE_2.jpg')
    ];
    
    for (const filePath of filesToCheck) {
      if (existsSync(filePath)) {
        console.log(`File exists: ${filePath}`);
        // Check file permissions
        try {
          const stats = await fs.stat(filePath);
          console.log(`File permissions: ${stats.mode.toString(8)}`);
        } catch (error) {
          console.error(`Error checking file permissions: ${error.message}`);
        }
      } else {
        console.log(`File missing: ${filePath}`);
      }
    }
    
    // Verify all uploads directories are accessible
    for (const dir of ['', ...dirs]) {
      const dirPath = dir ? join(uploadsDir, dir) : uploadsDir;
      try {
        const files = await fs.readdir(dirPath);
        console.log(`Directory ${dirPath} is readable and contains ${files.length} files`);
      } catch (error) {
        console.error(`Error accessing directory ${dirPath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Create upload directories
    await createUploadDirectories();
    
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Server will not start.');
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      } else {
        console.log('Continuing in production despite database connection failure');
      }
    }

    // Setup routes FIRST
    await setupRoutes();
    
    // Add custom error handler for all API routes
    app.use((err, req, res, next) => {
      if (req.originalUrl?.startsWith('/api/') && !res.headersSent) {
        console.error(`Error in API request ${req.method} ${req.originalUrl}:`, err);
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
          path: req.originalUrl
        });
      } else {
        next(err);
      }
    });

    // THEN serve static files and add catch-all route AFTER API routes are registered
    // --- Serve Static Frontend Files (Added for Render deployment) ---
    // Serve the built Vite assets from the 'dist' directory
    console.log(`Checking for dist directory: ${join(__dirname, 'dist')}, exists: ${existsSync(join(__dirname, 'dist'))}`);
    app.use(express.static(join(__dirname, 'dist')));

    // --- Catch-all Route (Added for Render deployment) ---
    // For any request that doesn't match an API route or a static file,
    // serve the index.html. This is crucial for React Router.
    app.get('*', (req, res) => {
      // Avoid sending HTML for API-like paths that weren't matched explicitly
      if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/uploads/')) {
         return res.status(404).json({ message: 'Resource not found' });
      }
      // Check if index.html exists before sending it
      if (existsSync(join(__dirname, 'dist', 'index.html'))) {
        console.log(`Serving index.html for path: ${req.originalUrl}`);
        res.sendFile(join(__dirname, 'dist', 'index.html'));
      } else {
        console.log(`Cannot serve index.html for path: ${req.originalUrl} - file doesn't exist`);
        res.status(404).json({ 
          message: 'Frontend not built properly',
          requested_path: req.originalUrl,
          dist_dir_exists: existsSync(join(__dirname, 'dist'))
        });
      }
    });

    // Start listening - Using environment port and 0.0.0.0 host for Render
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 