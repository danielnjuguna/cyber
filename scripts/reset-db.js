import { pool } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  try {
    console.log('Starting database reset...');

    // Drop existing tables in correct order (respecting foreign key constraints)
    console.log('Dropping existing tables...');
    await pool.execute('DROP TABLE IF EXISTS password_reset_tokens');
    await pool.execute('DROP TABLE IF EXISTS documents');
    await pool.execute('DROP TABLE IF EXISTS services');
    await pool.execute('DROP TABLE IF EXISTS users');

    // Create users table
    console.log('Creating users table...');
    await pool.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create password_reset_tokens table
    console.log('Creating password_reset_tokens table...');
    await pool.execute(`
      CREATE TABLE password_reset_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create services table
    console.log('Creating services table...');
    await pool.execute(`
      CREATE TABLE services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        long_description TEXT,
        image_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create documents table
    console.log('Creating documents table...');
    await pool.execute(`
      CREATE TABLE documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        document_path VARCHAR(255) NOT NULL,
        thumbnail_path VARCHAR(255),
        preview_text TEXT,
        category VARCHAR(50) DEFAULT 'other',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create admin user using environment variables
    console.log('Creating admin user from .env variables...');
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in the .env file.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    console.log(`Inserting admin user: ${adminEmail}`);
    await pool.execute(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [adminEmail, hashedPassword, 'admin']
    );

    console.log('Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase(); 