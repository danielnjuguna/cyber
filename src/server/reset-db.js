import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'document_system';

const resetDatabase = async () => {
  try {
    // Create a connection without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      ssl: {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      }
    });
    
    console.log('Dropping database...');
    await connection.execute(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    console.log(`Database ${DB_NAME} dropped successfully`);
    
    await connection.end();
    console.log('Database reset complete. You can now restart your server to create a new database with the updated admin password.');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
};

// Run the reset function
resetDatabase(); 