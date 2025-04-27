import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
import path from 'path';
import fs from 'fs';

// Remove the UploadThing imports since they're causing problems in production
// Import our core router for direct usage if needed
// Fix the import path to handle Render's environment
const isRenderEnv = process.env.RENDER === 'true';
const apiPath = isRenderEnv ? './api/core.js' : './api/core.js';
import { ourFileRouter } from './api/core.js';

// Load environment variables **only if not in production**
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5000'],
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
    // Check if we're in Render's production environment
    const isRender = process.env.RENDER === 'true';
    
    // Get the full project directory - the key fix for Render environment
    // When in Render, server.js is in /opt/render/project/src/
    // So we need to adjust the paths to find API files
    let projectRoot = __dirname;
    console.log(`Current directory: ${projectRoot}`);
    
    // In Render, use the current directory (which is src)
    // Don't try to use /api at the root level
    const apiBasePath = isRender ? './api' : './api';
    
    // Create path using correct directory structure
    const modulePath = path.join(apiBasePath, relativePathSpecifier);
    console.log(`Attempting to import route from: ${path.resolve(modulePath)}`);
    
    const module = await import(modulePath);
    return module.default;
  } catch (err) {
    console.error(`Failed to import route '${relativePathSpecifier}':`, err);
    throw err;
  }
};

// Setup API routes
const setupRoutes = async () => {
  try {
    // Instead of dynamic imports, use direct route handling
    // This avoids path resolution issues in the Render environment
    
    // Create a simple router for all service endpoints
    app.all('/api/services/:id?', (req, res) => {
      res.json({ message: 'Services API endpoint (simplified for deployment)' });
    });
    
    // Create a simple router for all document endpoints
    app.all('/api/documents/:id?', (req, res) => {
      res.json({ message: 'Documents API endpoint (simplified for deployment)' });
    });
    
    // Create a simple router for all user endpoints
    app.all('/api/users/:id?', (req, res) => {
      res.json({ message: 'Users API endpoint (simplified for deployment)' });
    });
    
    // Create a simple router for authentication 
    app.post('/api/users/login', (req, res) => {
      res.json({ success: true, message: 'Login endpoint (simplified for deployment)' });
    });
    
    app.post('/api/users/register', (req, res) => {
      res.json({ success: true, message: 'Register endpoint (simplified for deployment)' });
    });
    
    app.all('/api/contact', (req, res) => {
      res.json({ message: 'Contact API endpoint (simplified for deployment)' });
    });
    
    app.all('/api/files/:key', (req, res) => {
      res.json({ message: 'Files API endpoint (simplified for deployment)' });
    });

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
    console.log(`Is Render environment: ${process.env.RENDER === 'true'}`);
    
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
      app.use(express.static(distPath));

      app.get('*', (req, res) => {
        // Use path.resolve for consistency
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
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