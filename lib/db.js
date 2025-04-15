import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'document_system';

// Log database connection details (without sensitive info)
console.log(`Attempting to connect to database: ${DB_NAME}`);
console.log(`DB Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`DB User: ${process.env.DB_USER || 'root'}`);
console.log(`DB Connection Limit: ${parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10)}`);
console.log(`DB SSL Reject Unauthorized: ${process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false'}`);

// Create connection pool - This will be imported by serverless functions
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
  queueLimit: 0,
  ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' 
    ? { rejectUnauthorized: true } 
    : { rejectUnauthorized: false }
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle MySQL connection:', err);
  // Don't exit process on connection error in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Helper function to test the connection
export const testConnection = async () => {
  try {
    console.log(`Testing database connection to ${DB_NAME}...`);
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    
    // Test a simple query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log(`Query test result: ${JSON.stringify(rows)}`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    console.error('Database connection details:', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: DB_NAME,
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ? 'required' : 'optional'
    });
    
    // Don't fail in production, attempt to continue
    if (process.env.NODE_ENV === 'production') {
      console.log('Continuing despite database connection failure (production environment)');
      return true;
    }
    return false;
  }
};

// Optional: Add a helper function to ensure connection on demand
export const getConnection = async () => {
  return pool;
}; 