import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { testConnection } from './lib/db.js';
// import formidable from 'formidable'; // No longer needed for these routes
import path from 'path';
import fs from 'fs';

// Import UploadThing helpers
import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from './api/core.js'; // Keep importing the router definition

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname); // Go one level up from the current file's directory

const app = express();
const port = process.env.PORT || 5000;

// Middleware
// --- EDIT START ---
// app.use(cors());
// Use a more specific CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ut-cache', 'x-ut-preflight', 'x-uploadthing-version', 'x-uploadthing-user-id', 'x-uploadthing-package']
}));
// --- EDIT END ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- REMOVED FORMIDABLE MIDDLEWARE ---
/*
// Formidable middleware for file uploads - update to handle both document routes
app.use('/api/documents', (req, res, next) => {
  // ... formidable logic ...
});

app.use('/api/services', (req, res, next) => {
  // ... formidable logic ...
});
*/

// --- REMOVED STATIC SERVING OF UPLOADS ---
/*
// Serve static files from uploads directory with better error handling
app.use('/uploads', (req, res, next) => {
  console.log(`Serving static file: ${req.url}`);
  next();
}, express.static(join(__dirname, 'uploads'), {
  // ... options ...
}));

// Add a second static path for absolute uploads path to handle path issues
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
*/

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

// --- EDIT START ---
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
// --- EDIT END ---

// Mount UploadThing endpoint directly
// --- EDIT START ---
/* COMMENT OUT START
app.use(
  "/api/uploadthing",
  async (req, res, next) => {
    try {
      // Import the handler dynamically
      const module = await import('./api/uploadthing.js');
      const handler = module.default;
      
      // Call the handler
      await handler(req, res);
    } catch (error) {
      console.error('UploadThing error:', error);
      res.status(500).json({ 
        error: true, 
        message: 'Server error processing upload request'
      });
    }
  }
);
COMMENT OUT END */

// Use the official UploadThing route handler
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: ourFileRouter,
    config: { 
      // Make sure token is read from env vars
      uploadthingSecret: process.env.UPLOADTHING_SECRET,
      uploadthingId: process.env.UPLOADTHING_APP_ID,
      uploadthingToken: process.env.UPLOADTHING_TOKEN,
      // Add debugging if helpful
      isDev: process.env.NODE_ENV === 'development',
    }
  })
);
// --- EDIT END ---

// Import API routes
const importRoute = async (relativePath) => {
  const absolutePath = path.resolve(projectRoot, relativePath);
  console.log(`Importing route from: ${absolutePath}`);
  const module = await import(absolutePath);
  return module.default;
};

// Setup API routes
const setupRoutes = async () => {
  // Import standard handlers (paths relative to projectRoot)
  const servicesHandler = await importRoute('api/services/index.js');
  const servicesIdHandler = await importRoute('api/services/[id].js');
  const documentsHandler = await importRoute('api/documents/index.js');
  const documentsIdHandler = await importRoute('api/documents/[id].js');
  const usersHandler = await importRoute('api/users/index.js');
  const usersIdHandler = await importRoute('api/users/[id].js');
  const contactHandler = await importRoute('api/contact/index.js');
  
  // Import file handlers (path relative to projectRoot)
  const filesKeyHandler = await importRoute('api/files/[key].js');
  
  // Import authentication handlers (paths relative to projectRoot)
  const loginHandler = await importRoute('api/users/login.js');
  const registerHandler = await importRoute('api/users/register.js');
  const profileHandler = await importRoute('api/users/profile.js');
  const requestResetHandler = await importRoute('api/users/request-reset.js');
  const resetPasswordHandler = await importRoute('api/users/reset-password.js');

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
  
  // Parse key from URL and attach to req.query
  const parseKeyParam = (req, res, next) => {
    const parts = req.url.split('/');
    const key = parts[parts.length - 1];
    if (key) {
      req.query.key = key;
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

  // Mount file API routes - ensure this is working correctly
  app.all('/api/files/:key', parseKeyParam, (req, res) => {
    console.log(`🔄 Routing ${req.method} request to files/:key handler, params:`, req.params);
    return toExpressHandler(filesKeyHandler)(req, res);
  });

  // Add a test route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Add a test route for uploads
  app.get('/api/upload-test', (req, res) => {
    try {
      // List files in the uploads directory
      const uploadsPath = path.join(__dirname, 'uploads');
      const files = fs.readdirSync(uploadsPath);
      
      // Create test HTML response
      let html = `
      <html>
        <head>
          <title>Upload Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .image-container { display: flex; flex-wrap: wrap; gap: 15px; }
            .image-item { border: 1px solid #ddd; padding: 10px; border-radius: 5px; width: 320px; margin-bottom: 15px; }
            .image-item.error { border-color: #ffcccc; background-color: #fff8f8; }
            .image-item.success { border-color: #ccffcc; background-color: #f8fff8; }
            .img-container { position: relative; height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; background: #f9f9f9; }
            img { max-width: 300px; max-height: 180px; display: block; }
            .details { font-size: 14px; }
            .details div { margin-bottom: 5px; }
            .file-path { font-family: monospace; word-break: break-all; background: #eee; padding: 5px; border-radius: 3px; }
            .view-link { display: inline-block; margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; text-decoration: none; border-radius: 3px; }
            .view-link:hover { background: #0056b3; }
            .error-msg { color: #d9534f; }
            .success-msg { color: #5cb85c; }
          </style>
        </head>
        <body>
          <h1>Upload Test Page</h1>
          <div class="summary">
            <p>This page tests if uploaded files are accessible.</p>
            <p><strong>Files found in uploads directory:</strong> ${files.length}</p>
            <p><strong>Server time:</strong> ${new Date().toLocaleString()}</p>
            <p>Each file below shows whether it can be accessed through the browser. If an image doesn't load, check the console for network errors.</p>
          </div>
          <div class="image-container">
      `;
      
      // Add each file to the HTML
      files.forEach(file => {
        // Skip directories
        if (fs.statSync(path.join(uploadsPath, file)).isDirectory()) {
          return;
        }
        
        const filePath = `/uploads/${file}`;
        const fileUrl = encodeURI(filePath);
        const fileExtension = path.extname(file).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(fileExtension);
        
        html += `
          <div class="image-item" id="file-${file.replace(/[^a-zA-Z0-9]/g, '_')}">
            <div class="img-container">
              ${isImage 
                ? `<img src="${fileUrl}" alt="${file}" 
                     onerror="this.onerror=null; this.src='/not-found.png'; this.alt='Image not found'; document.getElementById('file-${file.replace(/[^a-zA-Z0-9]/g, '_')}').classList.add('error'); document.getElementById('status-${file.replace(/[^a-zA-Z0-9]/g, '_')}').innerHTML='<span class=\"error-msg\">❌ Not accessible</span>';" 
                     onload="document.getElementById('file-${file.replace(/[^a-zA-Z0-9]/g, '_')}').classList.add('success'); document.getElementById('status-${file.replace(/[^a-zA-Z0-9]/g, '_')}').innerHTML='<span class=\"success-msg\">✅ Accessible</span>';" />`
                : `<div style="text-align: center;">Non-image file</div>`
              }
            </div>
            <div class="details">
              <div><strong>Name:</strong> ${file}</div>
              <div><strong>Type:</strong> ${fileExtension.replace('.', '') || 'unknown'}</div>
              <div><strong>Encoded URL:</strong> <span class="file-path">${fileUrl}</span></div>
              <div><strong>Status:</strong> <span id="status-${file.replace(/[^a-zA-Z0-9]/g, '_')}">Checking...</span></div>
              <a href="${fileUrl}" target="_blank" class="view-link">View File</a>
            </div>
          </div>
        `;
      });
      
      html += `
            <script>
              // Check a fetch request to each file
              document.addEventListener('DOMContentLoaded', () => {
                // Add fetch tests for each file
                ${files.map(file => {
                  if (fs.statSync(path.join(uploadsPath, file)).isDirectory()) return '';
                  const fileUrl = encodeURI(`/uploads/${file}`);
                  const fileId = file.replace(/[^a-zA-Z0-9]/g, '_');
                  return `
                    fetch('${fileUrl}')
                      .then(response => {
                        if (!response.ok) {
                          throw new Error('Network response was not ok: ' + response.status);
                        }
                        return response.blob();
                      })
                      .then(_ => {
                        document.getElementById('status-${fileId}').innerHTML = '<span class="success-msg">✅ Accessible via fetch</span>';
                        document.getElementById('file-${fileId}').classList.add('success'); 
                      })
                      .catch(error => {
                        document.getElementById('status-${fileId}').innerHTML = '<span class="error-msg">❌ Not accessible via fetch: ' + error.message + '</span>';
                        document.getElementById('file-${fileId}').classList.add('error');
                      });
                  `;
                }).join('\n')}
              });
            </script>
          </div>
        </body>
      </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Upload test error:', error);
      res.status(500).json({ error: 'Failed to access upload directory', details: error.message });
    }
  });
};

// --- REMOVE UPLOAD DIRECTORY CREATION --- 
/*
const createUploadDirectories = async () => {
  const uploadsPath = join(__dirname, 'uploads');
  const thumbnailsPath = join(uploadsPath, 'thumbnails');
  try {
    await fs.mkdir(uploadsPath, { recursive: true });
    await fs.mkdir(thumbnailsPath, { recursive: true });
    console.log('Uploads and thumbnails directories created or already exist.');
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};
*/

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
    // Test database connection
    await testConnection();

    // --- REMOVED CALL TO createUploadDirectories --- 
    // await createUploadDirectories(); 
    
    // Create upload directories
    createUploadDirectories();

    // Setup API routes
    await setupRoutes();

    // Handle any remaining requests (e.g., 404 for API)
    app.use('/api/*', (req, res) => {
        res.status(404).json({ message: 'API endpoint not found' });
    });

    // Fallback for client-side routing (if needed, depends on frontend setup)
    // If you're serving the frontend build from Express:
    // app.get('*', (req, res) => {
    //   res.sendFile(join(__dirname, 'public', 'index.html')); // Adjust path if necessary
    // });

    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 