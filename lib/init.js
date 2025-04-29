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
    
    // 2. Update schema to support superadmin role
    try {
      console.log('Updating users table schema to support superadmin role...');
      await pool.execute(
        "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'"
      );
      console.log('✅ Schema updated to support superadmin role');
    } catch (error) {
      // If there's an error, it might be because:
      // 1. The column already supports superadmin (good)
      // 2. There's a real error with the query
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('check that column/key exists')) {
        console.log('ℹ️ Schema already supports superadmin role');
      } else {
        console.error('❌ Error updating schema:', error.message);
        // Continue anyway - don't let schema update failure prevent server start
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