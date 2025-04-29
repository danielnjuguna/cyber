import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
import path from 'path';
import fs from 'fs';
import { createRouteHandler } from "uploadthing/express"; // Import the official handler
import { ourFileRouter } from './api/core.js'; // Import your router

// Print all environment variables to help with debugging (without sensitive values)
console.log('==== ENVIRONMENT INFO ====');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`RENDER: ${process.env.RENDER}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`DB_HOST: ${process.env.DB_HOST ? 'Set' : 'Not set'}`);
console.log(`DB_USER: ${process.env.DB_USER ? 'Set' : 'Not set'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? 'Set (hidden)' : 'Not set'}`);
console.log(`DB_NAME: ${process.env.DB_NAME ? 'Set' : 'Not set'}`);
console.log(`UPLOADTHING_SECRET: ${process.env.UPLOADTHING_SECRET ? 'Set (hidden)' : 'Not set'}`);

// IMPORTANT: Determine if we're in the Render environment
const isRenderEnvironment = process.env.RENDER === 'true';

// CRITICAL: Force production mode when on Render
if (isRenderEnvironment) {
  console.log('Rendering environment detected - forcing production settings');
  process.env.NODE_ENV = 'production';
}

// Load environment variables from .env file ONLY if we're not in production
// This is important so Render's environment variables take precedence
if (process.env.NODE_ENV !== 'production') {
  console.log('Loading .env file (development mode)');
  // Check if running from dist and adjust .env path if needed
  const potentialEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
  if (fs.existsSync(potentialEnvPath)) {
    dotenv.config({ path: potentialEnvPath });
  } else {
    dotenv.config(); // Assume running from root in local dev
  }
} else {
  console.log('Using environment variables from Render (production mode)');
}

const __filename = fileURLToPath(import.meta.url);
// __dirname will now be /opt/render/project/src/dist (or similar)
const __dirname = dirname(__filename);
// Get the actual project root directory (one level up from dist)
const projectRoot = path.resolve(__dirname, '..'); 
console.log(`Server running from: ${__dirname}`);
console.log(`Project root determined as: ${projectRoot}`);

const app = express();

// CRITICAL: Use the PORT from environment variables, or fallback to 5000 for development 
// Port 10000 is what Render expects based on your render.yaml
const port = process.env.PORT || 5000;
console.log(`Using port: ${port}`);

// Update CORS settings to allow Render domain
app.use(cors({
  origin: [
    'http://localhost:8080', 
    'http://localhost:5000',
    'https://cyberdocs-app.onrender.com',  // Placeholder, might remove later
    'https://cyber-1-lywa.onrender.com',   // <<< Added your actual deployed frontend URL
    'https://cyberkendos-mnin.onrender.com', // <<< Added NEW actual deployed frontend URL
    'https://cyberdocs.onrender.com',       // Placeholder? Keep if needed
    // Add any other production domains here if needed
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ut-cache', 'x-ut-preflight', 'x-uploadthing-version', 'x-uploadthing-user-id', 'x-uploadthing-package']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
// Path needs to be relative to projectRoot, not __dirname (which is dist)
const uploadsDirPath = path.join(projectRoot, 'uploads');
console.log(`Serving uploads from: ${uploadsDirPath}`);
app.use('/uploads', (req, res, next) => {
  try {
    // Decode the URL path to handle special characters in filenames
    const decodedPath = decodeURIComponent(req.path);
    console.log(`Serving static file from uploads. Original: ${req.path}, Decoded: ${decodedPath}`);
    
    // Use the decoded path to find the file
    const filePath = path.join(uploadsDirPath, decodedPath);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`File not found: ${filePath}`, err);
        return res.status(404).json({ message: 'File not found' });
      }
      
      // File exists, continue to serve it
      // But we need to set req.url to the decoded path for express.static to work
      req.url = decodedPath;
      next();
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}, express.static(uploadsDirPath, {
  maxAge: '1d', // Cache static files for 1 day
  fallthrough: false,
  // Handle errors when file not found or other issues
  setHeaders: (res, filePath, stat) => {
    // Add appropriate headers based on file type
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      res.set('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`);
    } else if (ext === 'pdf') {
      res.set('Content-Type', 'application/pdf');
    } else if (ext === 'docx') {
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
  }
}));

// Serve static files from public directory (Keep this if you have other public assets)
// Path needs to be relative to projectRoot
const publicDirPath = path.join(projectRoot, 'public');
console.log(`Serving public assets from: ${publicDirPath}`);
app.use(express.static(publicDirPath));

// Log requests to help with debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Add an endpoint to get the UploadThing token for the client
app.get('/api/upload-token', (req, res) => {
  try {
    // This is just for debugging purposes - in a real app you'd authenticate the user first
    const token = process.env.UPLOADTHING_TOKEN;
    if (!token) {
      return res.status(500).json({
        error: true,
        message: 'UploadThing token not configured'
      });
    }
    
    res.json({
      success: true,
      token: token,
      // Don't send the full token in the logs for security
      tokenInfo: {
        length: token.length,
        prefix: token.substring(0, 8) + '...'
      }
    });
  } catch (error) {
    console.error('Error providing upload token:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Server error retrieving upload token'
    });
  }
});

// --- Import Route Handlers ---
const importRoute = async (relativePathSpecifier) => {
  try {
    const modulePath = path.resolve(__dirname, 'api', relativePathSpecifier);
    const importPath = `file://${modulePath}`;
    console.log(`Attempting to import route from dist: ${importPath}`);
    const module = await import(importPath);
    return module.default;
  } catch (err) {
    console.error(`Failed to import route '${relativePathSpecifier}' from dist:`, err);
    throw err; // Re-throw error to be caught by setupRoutes
  }
};

// --- API Setup Function ---
const setupRoutes = async () => {
  console.log('Setting up API routes...');
  try {
    // --- PUBLIC AUTH ROUTES (No Auth Middleware) ---
    console.log('  Setting up PUBLIC auth routes...');
    const loginHandler = await importRoute('users/login.js');
    app.post('/api/users/login', loginHandler);
    console.log('    ✓ POST /api/users/login');

    const registerHandler = await importRoute('users/register.js');
    app.post('/api/users/register', registerHandler);
    console.log('    ✓ POST /api/users/register');

    const requestResetHandler = await importRoute('users/request-reset.js');
    app.post('/api/users/request-reset', requestResetHandler);
    console.log('    ✓ POST /api/users/request-reset');

    const resetPasswordHandler = await importRoute('users/reset-password.js');
    app.post('/api/users/reset-password', resetPasswordHandler);
    console.log('    ✓ POST /api/users/reset-password');

    const profileHandler = await importRoute('users/profile.js');
    app.get('/api/users/profile', profileHandler); 
    console.log('    ✓ GET /api/users/profile');

    // --- RESOURCE ROUTES (Collections & Specific Items) ---
    console.log('  Setting up RESOURCE routes...');

    // Users (Admin & Specific ID)
    const adminUsersHandler = await importRoute('users/index.js'); // Handles GET /api/users, POST /api/users
    const userIdHandler = await importRoute('users/[id].js');     // Handles GET /api/users/:id, PUT ..., DELETE ...
    app.get('/api/users', adminUsersHandler);
    app.post('/api/users', adminUsersHandler);
    app.get('/api/users/:id', userIdHandler);
    app.put('/api/users/:id', userIdHandler);
    app.delete('/api/users/:id', userIdHandler);
    console.log('    ✓ /api/users routes configured');

    // Documents (Collection & Specific ID)
    const documentsHandler = await importRoute('documents/index.js'); // Handles GET /api/documents, POST /api/documents
    const documentIdHandler = await importRoute('documents/[id].js'); // Handles GET /api/documents/:id, PUT ..., DELETE ...
    const documentDownloadHandler = await importRoute('documents/[id]/download.js'); // Handles GET /api/documents/:id/download
    app.get('/api/documents', documentsHandler);
    app.post('/api/documents', documentsHandler);
    app.get('/api/documents/:id', documentIdHandler);
    app.put('/api/documents/:id', documentIdHandler);
    app.delete('/api/documents/:id', documentIdHandler);
    app.get('/api/documents/:id/download', documentDownloadHandler);
    console.log('    ✓ /api/documents routes configured');

    // Services (Collection & Specific ID)
    const servicesHandler = await importRoute('services/index.js'); // Handles GET /api/services, POST /api/services
    const serviceIdHandler = await importRoute('services/[id].js');  // Handles GET /api/services/:id, PUT ..., DELETE ...
    app.get('/api/services', servicesHandler);
    app.post('/api/services', servicesHandler);
    app.get('/api/services/:id', serviceIdHandler);
    app.put('/api/services/:id', serviceIdHandler);
    app.delete('/api/services/:id', serviceIdHandler);
    console.log('    ✓ /api/services routes configured');

    // Contact (Likely just POST)
    const contactHandler = await importRoute('contact/index.js');
    app.post('/api/contact', contactHandler);
    console.log('    ✓ POST /api/contact');

    // Files (DELETE only with key? Check files/index.js)
    const filesHandler = await importRoute('files/index.js');
    // Assuming files/index.js handles DELETE /api/files/:key
    app.use('/api/files', filesHandler);
    console.log('    ✓ /api/files routes configured (check handler for methods)');

    // --- UploadThing Route ---
    console.log('  Setting up UploadThing routes...');
    if (process.env.UPLOADTHING_SECRET && process.env.UPLOADTHING_APP_ID) {
      try {
        // Use the official createRouteHandler
        app.use(
          "/api/uploadthing",
          createRouteHandler({
            router: ourFileRouter,
            config: { 
              uploadthingSecret: process.env.UPLOADTHING_SECRET,
              uploadthingId: process.env.UPLOADTHING_APP_ID,
              // You might need to add other config options here based on your setup
              // e.g., isDev: process.env.NODE_ENV === 'development',
            },
          })
        );
        console.log('    ✓ /api/uploadthing configured with createRouteHandler');
      } catch (utError) {
         console.error('    ❌ Error configuring UploadThing createRouteHandler:', utError);
         app.use('/api/uploadthing', (req, res) => res.status(503).json({ message: 'UploadThing unavailable due to config error' }));
      }
    } else {
      console.warn('    ⚠️ UploadThing secrets not found, /api/uploadthing route disabled.');
      app.use('/api/uploadthing', (req, res) => res.status(503).json({ message: 'UploadThing not configured' }));
    }

    // Health check route (Public)
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Server is running' });
    });
    console.log('    ✓ /api/health');

    console.log('✓ API routes setup complete.');

  } catch (error) {
    console.error('❌ Failed to set up API routes:', error);
    // Fallback or specific error handling if needed in production
    app.use('/api/*', (req, res) => {
        res.status(500).json({ message: 'Error initializing API routes', error: error.message });
    });
  }
};

// Ensure uploads directory exists
// Path needs to be relative to projectRoot
const createUploadDirectories = () => {
  const uploadsPath = path.join(projectRoot, 'uploads');
  const thumbnailsPath = path.join(uploadsPath, 'thumbnails');
  try {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    if (!fs.existsSync(thumbnailsPath)) {
      fs.mkdirSync(thumbnailsPath, { recursive: true });
    }
    console.log('Uploads and thumbnails directories created or already exist.');
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

const startServer = async () => {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV} mode`);
    console.log(`Server running from directory: ${__dirname}`); // Log current dir (dist)
    console.log(`Is Render environment: ${isRenderEnvironment}`);
    
    // Test database connection
    await testConnection();
    
    // Create upload directories
    createUploadDirectories();

    // Setup API routes
    await setupRoutes();

    // Handle any remaining requests (e.g., 404 for API)
    app.use('/api/*', (req, res) => {
        res.status(404).json({ message: 'API endpoint not found' });
    });

    // Serve the frontend from the build directory if we're in production
    if (process.env.NODE_ENV === 'production') {
      // The distPath is now simply __dirname, as server.js is inside dist
      const distPath = __dirname;
      console.log(`Serving static frontend files from: ${distPath}`);
      
      // Check if the index.html file exists within dist
      const indexHtmlPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        console.log('dist/index.html exists, serving static files');
        app.use(express.static(distPath));
        
        app.get('*', (req, res) => {
          res.sendFile(indexHtmlPath);
        });
      } else {
        console.error('ERROR: dist/index.html does not exist at:', indexHtmlPath);
        console.log('dist directory contains:', fs.readdirSync(distPath));
      }
    }

    // Update the listen log message
    app.listen(port, '0.0.0.0', () => { // Listen on 0.0.0.0 for Render
      console.log(`Server listening on port ${port}`); // More generic message
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 