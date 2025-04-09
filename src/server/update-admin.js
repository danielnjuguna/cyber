import bcrypt from 'bcryptjs';
import { pool } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const updateAdminPassword = async () => {
  try {
    console.log('Updating admin password...');
    
    // Generate a new password hash for 'admin123'
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log(`Generated new hash for "${password}": ${hashedPassword}`);
    
    // Update the admin user password
    await pool.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@whizmo.com']
    );
    
    console.log('Admin password updated successfully!');
    
    // Verify the update
    const [users] = await pool.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['admin@whizmo.com']
    );
    
    if (users.length > 0) {
      console.log(`Verified admin user: ${users[0].email} (ID: ${users[0].id}, Role: ${users[0].role})`);
    } else {
      console.log('Warning: Admin user not found after update!');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    // Close the pool
    pool.end();
  }
};

// Run the update
updateAdminPassword(); 