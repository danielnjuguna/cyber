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
    // 1. Check if database connection works
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // 2. Update users table schema to support superadmin role
    try {
      console.log('Ensuring users table schema supports superadmin role...');
      await pool.execute(
        "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'"
      );
      console.log('✅ Users schema updated/verified for superadmin role');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('check that column/key exists') || error.message.includes('Duplicate column name') || error.message.includes('Unknown column')) {
        // Ignore errors indicating the column/enum value already exists or modification isn't needed
        console.log('ℹ️ Users schema likely already supports superadmin role');
      } else if (error.code === 'ER_ENUM_VALUE_ERROR') {
          console.log('ℹ️ Users schema already supports superadmin enum value.');
      } else {
        console.warn('⚠️ Warning during users schema update (continuing):', error.message);
      }
    }

    // 2b. Update documents table schema to include file_type
    try {
      console.log('Ensuring documents table schema has file_type column...');
      // Add file_type column if it doesn't exist
      await pool.execute(
        "ALTER TABLE documents ADD COLUMN file_type VARCHAR(20) NULL AFTER category;"
      );
      console.log('✅ Documents schema updated with file_type column');
    } catch (error) {
       if (error.code === 'ER_DUP_FIELDNAME') {
         console.log('ℹ️ Documents schema already has file_type column');
       } else {
         console.warn('⚠️ Warning during documents schema update (continuing):', error.message);
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
    console.error('❌ System initialization failed:', error);
    // Don't throw - return false to indicate initialization failed but allow server to try to start
    return false;
  }
} 