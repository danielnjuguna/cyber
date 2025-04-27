import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
import path from 'path';
import fs from 'fs';

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
dotenv.config();
} else {
  console.log('Using environment variables from Render (production mode)');
}

// Import core router after environment setup
// Use the same file:// protocol approach for consistency
// Note: Static imports cannot use dynamic paths, so we'll skip this optimization
// and rely on the default import path. The dynamic importRoute function is what we need to fix.
import { ourFileRouter } from './api/core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    'https://cyberdocs-app.onrender.com',  // Add your Render domain here
    'https://cyberdocs.onrender.com'       // And any other domains you might use
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ut-cache', 'x-ut-preflight', 'x-uploadthing-version', 'x-uploadthing-user-id', 'x-uploadthing-package']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', (req, res, next) => {
  try {
    // Decode the URL path to handle special characters in filenames
    const decodedPath = decodeURIComponent(req.path);
    console.log(`Serving static file from uploads. Original: ${req.path}, Decoded: ${decodedPath}`);
    
    // Use the decoded path to find the file
    const filePath = path.join(__dirname, 'uploads', decodedPath);
    
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
}, express.static(path.join(__dirname, 'uploads'), {
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
app.use(express.static(join(__dirname, 'public')));

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

// Temporarily disable UploadThing integration since it's not installed in production
app.use('/api/uploadthing', (req, res) => {
  res.status(503).json({
        error: true, 
    message: 'UploadThing service is currently unavailable'
  });
});

// Fix the importRoute function to look in the correct directory structure
const importRoute = async (relativePathSpecifier) => {
  try {
    // In ES modules, we must use URL-style paths with proper file:// protocol
    // or fully specify relative paths with ./
    
    // Here's the critical fix - use proper URL format for ES modules
    let importPath;
    
    if (isRenderEnvironment) {
      // When in Render, ensure we're using fully absolute paths with file:// protocol
      // This avoids Node treating 'api' as a package name
      const fullPath = path.resolve(__dirname, 'api', relativePathSpecifier);
      importPath = `file://${fullPath}`;
      console.log(`Attempting to import route from absolute path: ${importPath}`);
    } else {
      // When in development, use simple relative paths
      importPath = `./api/${relativePathSpecifier}`;
      console.log(`Attempting to import route from relative path: ${importPath}`);
    }
    
    const module = await import(importPath);
  return module.default;
  } catch (err) {
    console.error(`Failed to import route '${relativePathSpecifier}':`, err);
    throw err;
  }
};

// Setup API routes
const setupRoutes = async () => {
  try {
    // Use dynamic imports to load actual API routes
    console.log('Setting up routes with actual API handlers');
    
    // First, attempt to import all routes dynamically
    try {
      // Import users/auth routes (login, register, etc.)
      const usersRoute = await importRoute('users/index.js');
      app.use('/api/users', usersRoute);
      console.log('✓ Successfully loaded users routes');
      
      // Import documents routes
      const documentsRoute = await importRoute('documents/index.js');
      app.use('/api/documents', documentsRoute);
      console.log('✓ Successfully loaded documents routes');
      
      // Import services routes
      const servicesRoute = await importRoute('services/index.js');
      app.use('/api/services', servicesRoute);
      console.log('✓ Successfully loaded services routes');
      
      // Import contact routes
      const contactRoute = await importRoute('contact/index.js');
      app.use('/api/contact', contactRoute);
      console.log('✓ Successfully loaded contact routes');
      
      // Import files routes
      // Adjust to load the dynamic route file [key].js instead of index.js
      try {
        const filesRouteHandler = await importRoute('files/[key].js'); 
        // Mount the handler at the base path /api/files
        // The dynamic parameter will be handled by the route definition inside [key].js
        app.use('/api/files', filesRouteHandler);
        console.log('✓ Successfully loaded files routes from [key].js');
      } catch (error) {
        console.error(`Error loading files route 'files/[key].js':`, error);
        // Fallback for files route
        app.all('/api/files/:key?', (req, res) => {
          res.status(500).json({ message: 'Files API endpoint failed to load (fallback)' });
        });
      }
      
      // Import UploadThing routes if not disabled
      if (process.env.UPLOADTHING_SECRET && process.env.UPLOADTHING_APP_ID) {
        try {
          const uploadThingRoute = await importRoute('uploadthing.js');
          app.use('/api/uploadthing', uploadThingRoute);
          console.log('✓ Successfully loaded uploadthing routes');
        } catch (error) {
          console.error('Error loading UploadThing routes:', error);
          // Fallback to temporary disabled endpoint
          app.use('/api/uploadthing', (req, res) => {
            res.status(503).json({
              error: true,
              message: 'UploadThing service is currently unavailable'
            });
          });
        }
      }
    } catch (error) {
      console.error('Error loading dynamic routes, falling back to simplified routes:', error);
      
      // Fallback to simplified routes if dynamic imports fail
      
      // Create a simple router for all service endpoints
      app.all('/api/services/:id?', (req, res) => {
        res.json({ message: 'Services API endpoint (simplified fallback)' });
      });
      
      // Create a simple router for all document endpoints
      app.all('/api/documents/:id?', (req, res) => {
        res.json({ message: 'Documents API endpoint (simplified fallback)' });
      });
      
      // Create a simple router for all user endpoints
      app.all('/api/users/:id?', (req, res) => {
        res.json({ message: 'Users API endpoint (simplified fallback)' });
      });
      
      // Create a proper mock for the login endpoint that returns the expected structure
      app.post('/api/users/login', (req, res) => {
        console.log('Login attempt with:', req.body);
        
        // Extract credentials from request body
        const { email, password } = req.body;
        
        // Check if credentials match the admin credentials
        const isAdmin = email === process.env.ADMIN_EMAIL && 
                       password === process.env.ADMIN_PASSWORD;
        
        if (isAdmin) {
          // Return a proper user object with a role
          res.json({
            success: true,
            user: {
              id: 1,
              email: email,
              name: 'Admin User',
              role: 'admin',
              created_at: new Date().toISOString()
            },
            token: 'mock-jwt-token-for-testing'
          });
        } else {
          // Return a staff user for testing
          res.json({
            success: true,
            user: {
              id: 2,
              email: email,
              name: 'Staff User',
              role: 'staff',
              created_at: new Date().toISOString()
            },
            token: 'mock-jwt-token-for-testing'
          });
        }
      });
      
      app.post('/api/users/register', (req, res) => {
        res.json({ success: true, message: 'Register endpoint (simplified fallback)' });
      });
      
      app.all('/api/contact', (req, res) => {
        res.json({ message: 'Contact API endpoint (simplified fallback)' });
      });
      
      app.all('/api/files/:key', (req, res) => {
        res.json({ message: 'Files API endpoint (simplified fallback)' });
      });
    }

    // Add a test route
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Server is running',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          isRender: process.env.RENDER === 'true',
          renderServiceDir: process.env.RENDER_PROJECT_DIR || 'not set',
          currentDir: __dirname
        }
      });
    });
  } catch (error) {
    console.error('Failed to set up routes:', error);
    throw error;
  }
};

// Ensure uploads directory exists
const createUploadDirectories = () => {
  const uploadsPath = path.join(__dirname, 'uploads');
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
    console.log(`Current directory: ${__dirname}`);
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
      // Use path.resolve to ensure correct path joining, especially in different environments
      const distPath = path.resolve(__dirname, 'dist');
      console.log(`Serving static files from: ${distPath}`);
      
      // Check if the dist directory exists
      if (fs.existsSync(distPath)) {
        console.log('dist directory exists, serving static files');
        app.use(express.static(distPath));
        
        app.get('*', (req, res) => {
          // Use path.resolve for consistency
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      } else {
        console.error('ERROR: dist directory does not exist at:', distPath);
        console.log('Current directory contains:', fs.readdirSync(__dirname));
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