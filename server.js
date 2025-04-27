import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Print all environment variables to help with debugging
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
if (process.env.NODE_ENV !== 'production') {
  console.log('Loading .env file (development mode)');
  // Assume .env is in the project root (one level up from dist)
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded .env from:', envPath);
  } else {
    console.warn('No .env file found at:', envPath);
    // Fallback to potentially loading from current dir if running locally from root
    dotenv.config(); 
  }
} else {
  console.log('Using environment variables from Render (production mode)');
}

// Import database connection utility AFTER loading env vars
import { testConnection } from './lib/db.js';
// Import core router after environment setup
// This path assumes core.js is inside `dist/api`
import { ourFileRouter } from './api/core.js';

// Log the current directory where the server is running from
console.log(`Server running from directory: ${__dirname}`);

const app = express();

// Use the PORT from environment variables, fallback to 5000
const port = process.env.PORT || 5000;
console.log(`Using port: ${port}`);

// Update CORS settings
app.use(cors({
  origin: [
    'http://localhost:8080', 
    'http://localhost:5000',
    'https://cyberdocs-app.onrender.com', 
    'https://cyberdocs.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ut-cache', 'x-ut-preflight', 'x-uploadthing-version', 'x-uploadthing-user-id', 'x-uploadthing-package']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files from the uploads directory (now relative to project root)
const uploadsDirPath = path.join(__dirname, '../uploads'); // Adjust path relative to dist
console.log(`Attempting to serve uploads from: ${uploadsDirPath}`);
if (fs.existsSync(uploadsDirPath)) {
  app.use('/uploads', express.static(uploadsDirPath));
  console.log(`Successfully serving uploads from: ${uploadsDirPath}`);
} else {
  console.warn(`Uploads directory not found: ${uploadsDirPath}`);
}

// Fix the importRoute function to load from the correct directory (now inside dist)
const importRoute = async (relativePathSpecifier) => {
  try {
    const modulePath = path.resolve(__dirname, relativePathSpecifier);
    const importPath = `file://${modulePath}`;
    console.log(`Attempting to import route from: ${importPath}`);
    const module = await import(importPath);
    return module.default;
  } catch (err) {
    console.error(`Failed to import route '${relativePathSpecifier}' from dist:`, err);
    throw err;
  }
};

// Setup API routes
const setupRoutes = async () => {
  try {
    console.log('Setting up API routes...');
    // Dynamically load routes from the 'api' directory inside 'dist'
    const apiDirs = ['users', 'documents', 'services', 'contact', 'files', 'uploadthing'];
    for (const dir of apiDirs) {
      const routePath = `./api/${dir}${dir === 'uploadthing' ? '.js' : '/index.js'}`;
      try {
        const routeHandler = await importRoute(routePath);
        const routePrefix = `/api/${dir}`;
        app.use(routePrefix, routeHandler);
        console.log(`✓ Successfully loaded ${dir} routes`);
      } catch (error) {
        console.error(`Error loading ${dir} route:`, error);
        // Fallback for this specific route
        app.all(`/api/${dir}*`, (req, res) => {
          res.status(500).json({ message: `API endpoint for ${dir} failed to load.` });
        });
      }
    }

    // Add a test route
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'API is healthy' });
    });

  } catch (error) {
    console.error('Failed to set up API routes:', error);
    // Don't throw here, let the server start but log the error
  }
};

// Ensure uploads directory exists (relative to project root)
const createUploadDirectories = () => {
  const projectRootForUploads = path.resolve(__dirname, '..');
  const uploadsPath = path.join(projectRootForUploads, 'uploads');
  const thumbnailsPath = path.join(uploadsPath, 'thumbnails');
  try {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log(`Created uploads directory at ${uploadsPath}`);
    } else {
      console.log(`Uploads directory already exists at ${uploadsPath}`);
    }
    if (!fs.existsSync(thumbnailsPath)) {
      fs.mkdirSync(thumbnailsPath, { recursive: true });
      console.log(`Created thumbnails directory at ${thumbnailsPath}`);
    } else {
      console.log(`Thumbnails directory already exists at ${thumbnailsPath}`);
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

const startServer = async () => {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV} mode`);
    console.log(`Server running from directory: ${__dirname}`);

    // Test database connection
    await testConnection();
    
    // Create upload directories
    createUploadDirectories();

    // Setup API routes
    await setupRoutes();

    // Serve static frontend files ONLY in production
    if (process.env.NODE_ENV === 'production') {
      // Serve static files from the current directory (__dirname, which is 'dist')
      const staticPath = __dirname;
      console.log(`Serving static frontend files from: ${staticPath}`);
      
      const indexHtmlPath = path.resolve(staticPath, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        console.log('index.html found at:', indexHtmlPath);

        // Serve static assets from the 'assets' directory first
        app.use('/assets', express.static(path.join(staticPath, 'assets'), {
          maxAge: '1y', // Cache assets for a long time
          immutable: true, // Indicate assets are immutable
          setHeaders: (res, filePath) => {
             if (filePath.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            } else if (filePath.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css; charset=UTF-8');
            }
            console.log(`Serving asset: ${path.basename(filePath)}`);
          }
        }));

        // Serve other static files from the root
        app.use(express.static(staticPath));

        // Fallback for SPA: All other GET requests return index.html
        app.get('*', (req, res) => {
          // Avoid serving index.html for API routes
          if (req.path.startsWith('/api/')) {
             return res.status(404).json({ message: 'API endpoint not found' });
          }
          console.log(`SPA route handler serving index.html for: ${req.path}`);
          res.sendFile(indexHtmlPath);
        });
      } else {
        console.error('ERROR: index.html not found at:', indexHtmlPath);
        console.log('Contents of static path directory:');
        try {
          const files = fs.readdirSync(staticPath);
          files.forEach(file => console.log(` - ${file}`));
        } catch (err) {
          console.error('Error reading directory:', err);
        }
      }
    } else {
      // Handle API 404s if not in production (since no frontend is served)
      app.use('/api/*', (req, res) => {
        res.status(404).json({ message: 'API endpoint not found' });
      });
    }

    // Start the server
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 