import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs'; // Import file system module
import path from 'path';

dotenv.config();

// Determine project root dynamically
// Assuming this file (db.js) is in the 'lib' directory
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(__dirname, '..'); 

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306, // Add port
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
  queueLimit: 0,
  ssl: null, // Initialize ssl as null
};

// Conditionally configure SSL based on env variable
if (process.env.DB_SSL_REQUIRED === 'true') {
  console.log('SSL connection required. Attempting to load CA certificate...');
  const caPath = process.env.DB_SSL_CA_PATH;
  if (!caPath) {
    console.error('DB_SSL_REQUIRED is true, but DB_SSL_CA_PATH is not set.');
  } else {
    const fullCaPath = path.resolve(projectRoot, caPath);
    console.log(`Resolved CA certificate path: ${fullCaPath}`);
    try {
      if (fs.existsSync(fullCaPath)) {
        dbConfig.ssl = {
          ca: fs.readFileSync(fullCaPath),
          // Aiven often uses 'REQUIRED' which implies verify-ca or verify-full
          // We let the driver handle verification based on the CA
          rejectUnauthorized: true 
        };
        console.log('CA certificate loaded successfully for SSL connection.');
      } else {
        console.error(`CA certificate file not found at: ${fullCaPath}. SSL connection will likely fail.`);
        // Optionally, you might want to prevent the pool from being created here
        // or set ssl to a default that might still work depending on server config
        dbConfig.ssl = { rejectUnauthorized: false }; // Fallback if CA not found, might fail
      }
    } catch (err) {
      console.error(`Error reading CA certificate file at ${fullCaPath}:`, err);
      // Handle error appropriately - maybe fallback or prevent pool creation
      dbConfig.ssl = { rejectUnauthorized: false }; // Fallback on read error, might fail
    }
  }
} else {
  console.log('SSL connection not explicitly required by DB_SSL_REQUIRED flag.');
  // If SSL is not strictly required, you might still want to allow it 
  // or set rejectUnauthorized to false if you encounter issues without the flag
  // dbConfig.ssl = { rejectUnauthorized: false }; 
}


console.log('Final DB Config:', {
  ...dbConfig,
  password: dbConfig.password ? '[HIDDEN]' : undefined,
  ssl: dbConfig.ssl ? { ca: dbConfig.ssl.ca ? '[CA LOADED]' : '[CA NOT LOADED/ERROR]', rejectUnauthorized: dbConfig.ssl.rejectUnauthorized } : 'Not Configured'
});

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle MySQL connection:', err);
  // Removed process.exit(1) to prevent server crash on idle connection error
});

// Helper function to test the connection
export const testConnection = async () => {
  let connection;
  try {
    console.log('Attempting to get connection from pool...');
    connection = await pool.getConnection();
    console.log('Database connection successful (using Aiven config)');
    return true; // Return true on success
  } catch (error) {
    console.error('Database connection failed (using Aiven config):', error);
    return false; // Return false on failure
  } finally {
    if (connection) {
      connection.release();
      console.log('Connection released.');
    }
  }
};

// Optional: Add a helper function to ensure connection on demand
export const getConnection = async () => {
  // The pool handles connections automatically
  return pool; 
}; 