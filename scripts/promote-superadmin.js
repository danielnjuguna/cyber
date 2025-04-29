import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * This script allows promoting a user to superadmin by their email address.
 * Usage: node scripts/promote-superadmin.js
 * Or provide email as command line argument: node scripts/promote-superadmin.js user@example.com
 */
async function promoteToSuperAdmin() {
  let connection;
  
  try {
    console.log('=== CyberDocs Promote to SuperAdmin Tool ===');
    
    // Get email from command line argument or prompt
    let email = process.argv[2]; // Check command line args first
    
    if (!email) {
      // If not provided as command line arg, prompt for it
      email = await question('Enter user email to promote to superadmin: ');
    }
    
    if (!email) {
      console.error('Email is required!');
      process.exit(1);
    }
    
    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'document_system',
      ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        ? { rejectUnauthorized: true }
        : undefined,
    });
    
    console.log('Connected to database successfully.');
    
    // Check if the role column supports 'superadmin'
    try {
      console.log('Ensuring schema supports superadmin role...');
      await connection.execute(
        "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'"
      );
      console.log('Schema updated to support superadmin role.');
    } catch (error) {
      // If an error occurs, it could be because the column already supports 'superadmin'
      console.log('Role column already supports superadmin or other schema error.');
    }
    
    // Find the user by email
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }
    
    const user = users[0];
    
    // Check if user is already a superadmin
    if (user.role === 'superadmin') {
      console.log(`User ${email} is already a superadmin.`);
      process.exit(0);
    }
    
    // Promote the user to superadmin
    await connection.execute(
      "UPDATE users SET role = 'superadmin' WHERE id = ?",
      [user.id]
    );
    
    console.log(`✅ User ${email} has been promoted to superadmin successfully!`);
    console.log('You can now log in with this account to manage users and assign admin roles.');
    
  } catch (error) {
    console.error('Error promoting user to superadmin:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    rl.close();
  }
}

// Run the script
promoteToSuperAdmin(); 