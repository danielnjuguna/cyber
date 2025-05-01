import { pool } from './db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Get the superadmin email from environment variables
const SUPERADMIN_EMAIL = process.env.ADMIN_EMAIL || 'danielnjuguna9042@gmail.com';
const SUPERADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

export async function initializeSystem() {
  console.log('🚀 Initializing system...');
  
  try {
    // 0. Check DB connection first
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // 1. Ensure tables exist using CREATE TABLE IF NOT EXISTS
    console.log('Ensuring database tables exist...');

    // Users Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'superadmin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ users table ensured');

    // Password Reset Tokens Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ password_reset_tokens table ensured');

    // Services Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        long_description TEXT,
        imageUrl TEXT,
        imageKey VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ services table ensured');

    // Documents Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        document_url TEXT,
        document_key VARCHAR(255),
        thumbnail_url TEXT,
        thumbnail_key VARCHAR(255),
        preview_text TEXT,
        category VARCHAR(50) DEFAULT 'other',
        file_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ documents table ensured');
    console.log('✅ All tables ensured.');

    // 2. Update users table schema (idempotent check/update for superadmin role)
    // This might be redundant now but harmless with try/catch
    try {
      console.log('Ensuring users table schema supports superadmin role (post-creation check)...');
      await pool.execute(
        "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'"
      );
      console.log('✅ Users schema verified/updated for superadmin role');
    } catch (error) {
      // Existing error handling for ALTER TABLE is fine
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('check that column/key exists') || error.message.includes('Duplicate column name') || error.message.includes('Unknown column')) {
        console.log('ℹ️ Users schema already supports superadmin role');
      } else if (error.code === 'ER_ENUM_VALUE_ERROR') {
          console.log('ℹ️ Users schema already supports superadmin enum value.');
      } else {
        console.warn('⚠️ Warning during users schema update check (continuing):', error.message);
      }
    }

    // 2b. Update documents table schema (idempotent check/update for file_type)
    // This might be redundant now but harmless with try/catch
    try {
      console.log('Ensuring documents table schema has file_type column (post-creation check)...');
      await pool.execute(
        "ALTER TABLE documents ADD COLUMN file_type VARCHAR(50) NULL AFTER category;" // Match CREATE TABLE type
      );
      console.log('✅ Documents schema verified/updated with file_type column');
    } catch (error) {
       if (error.code === 'ER_DUP_FIELDNAME') {
         console.log('ℹ️ Documents schema already has file_type column');
       } else {
         console.warn('⚠️ Warning during documents schema update check (continuing):', error.message);
       }
    }

    // 2c. Update documents table schema (idempotent check/update for original_file_type)
    try {
      console.log('Ensuring documents table schema has original_file_type column...');
      await pool.execute(
        "ALTER TABLE documents ADD COLUMN original_file_type VARCHAR(50) NULL AFTER file_type;" // Add the new column
      );
      console.log('✅ Documents schema verified/updated with original_file_type column');
    } catch (error) {
       if (error.code === 'ER_DUP_FIELDNAME') {
         console.log('ℹ️ Documents schema already has original_file_type column');
       } else {
         console.warn('⚠️ Warning during documents schema update check for original_file_type (continuing):', error.message);
       }
    }

    // 2d. Update documents table schema (idempotent check/update for preview_page_limit)
    try {
      console.log('Ensuring documents table schema has preview_page_limit column...');
      await pool.execute(
        "ALTER TABLE documents ADD COLUMN preview_page_limit INT DEFAULT 1 AFTER original_file_type;" // Add the new column (Integer, default 1)
      );
      console.log('✅ Documents schema verified/updated with preview_page_limit column');
    } catch (error) {
       if (error.code === 'ER_DUP_FIELDNAME') {
         console.log('ℹ️ Documents schema already has preview_page_limit column');
       } else {
         console.warn('⚠️ Warning during documents schema update check for preview_page_limit (continuing):', error.message);
       }
    }

    // 3. Check if the configured superadmin exists and promote/create if needed
    try {
      console.log(`Checking for superadmin user (${SUPERADMIN_EMAIL})...`);
      
      // Check if user exists
      const [existingUsers] = await pool.execute(
        'SELECT id, role FROM users WHERE email = ?',
        [SUPERADMIN_EMAIL]
      );
      
      if (existingUsers.length > 0) {
        // User exists - check if they're already a superadmin
        if (existingUsers[0].role === 'superadmin') {
          console.log(`✅ User ${SUPERADMIN_EMAIL} is already a superadmin`);
        } else {
          // Promote user to superadmin
          await pool.execute(
            "UPDATE users SET role = 'superadmin' WHERE id = ?",
            [existingUsers[0].id]
          );
          console.log(`✅ User ${SUPERADMIN_EMAIL} promoted to superadmin`);
        }
      } else {
        // User doesn't exist - create a new superadmin user
        console.log(`Creating new superadmin user ${SUPERADMIN_EMAIL}...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);
        
        await pool.execute(
          'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
          [SUPERADMIN_EMAIL, hashedPassword, 'superadmin']
        );
        console.log(`✅ Superadmin user ${SUPERADMIN_EMAIL} created successfully`);
      }
    } catch (error) {
      console.error('❌ Error setting up superadmin:', error.message);
      // Continue anyway - don't let superadmin setup failure prevent server start
    }
    
    console.log('🎉 System initialization completed');
    return true;
  } catch (error) {
    // Catch errors during initial connection or table creation
    console.error('❌ Critical system initialization failed:', error);
    // Return false to indicate initialization failed but allow server to try to start
    // (though routes will likely fail if tables aren't created)
    return false;
  }
} 