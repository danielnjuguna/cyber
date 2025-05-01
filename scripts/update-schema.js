import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const alterCommands = [
  // Update the documents table (Corrected Syntax)
  `ALTER TABLE documents
   ADD COLUMN document_url VARCHAR(1024) NULL AFTER category,
   ADD COLUMN document_key VARCHAR(255) NULL AFTER document_url,
   ADD COLUMN thumbnail_url VARCHAR(1024) NULL AFTER document_key,
   ADD COLUMN thumbnail_key VARCHAR(255) NULL AFTER thumbnail_url,
   ADD COLUMN original_file_type VARCHAR(50) NULL AFTER file_type;`,
  // Update the services table (Corrected Syntax)
  `ALTER TABLE services
   ADD COLUMN image_url VARCHAR(1024) NULL AFTER long_description,
   ADD COLUMN image_key VARCHAR(255) NULL AFTER image_url;`,
  // Update the users table to ensure role allows superadmin value
  `ALTER TABLE users
   MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user';`
];

async function updateSchema() {
  let connection;
  try {
    // Create the connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cyberdocs',
      // Add SSL options if needed, based on your .env
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        ? { rejectUnauthorized: true }
        : undefined,
    });

    console.log('Connected to the database.');

    for (const command of alterCommands) {
      console.log(`Executing: ${command.split('\n')[0]}...`); // Log only the first line
      try {
        await connection.query(command);
        console.log('Command executed successfully.');
      } catch (error) {
        // MySQL error code for "Duplicate column name" is 1060
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.warn(`Warning: Column might already exist. Skipping command. (${error.sqlMessage})`);
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    console.log('Schema update process completed.');

  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1); // Exit with error code
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

updateSchema(); 