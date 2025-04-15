import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'document_system';

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
  process.exit(1);
});

// Helper function to test the connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Optional: Add a helper function to ensure connection on demand
export const getConnection = async () => {
  return pool;
}; 