import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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

async function createSuperAdmin() {
  let connection;
  
  try {
    console.log('=== CyberDocs SuperAdmin Creation Tool ===');
    
    // Connect to database
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
    
    // Check if superadmin role is supported
    try {
      await connection.execute(
        "SELECT 1 FROM users WHERE role = 'superadmin' LIMIT 1"
      );
    } catch (error) {
      // If there's an error, the column might not support the enum value
      if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('Data truncated')) {
        console.log('Updating database schema to support superadmin role...');
        await connection.execute(
          "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'"
        );
        console.log('Schema updated successfully.');
      } else {
        throw error;
      }
    }
    
    // Check if a superadmin already exists
    const [existingSuperadmins] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'"
    );
    
    if (existingSuperadmins[0].count > 0) {
      console.log(`\nThere are already ${existingSuperadmins[0].count} superadmin(s) in the system.`);
      const proceed = await question('Do you want to create another superadmin? (y/n): ');
      
      if (proceed.toLowerCase() !== 'y') {
        console.log('Operation cancelled by user.');
        return;
      }
    }
    
    // Get superadmin details
    console.log('\nPlease enter the details for the new superadmin:');
    const email = await question('Email: ');
    const password = await question('Password: ');
    const phone = await question('Phone (optional, press Enter to skip): ');
    
    // Validate input
    if (!email || !password) {
      console.error('Email and password are required!');
      return;
    }
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, role FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      // User exists, ask if we should update the role
      console.log(`\nA user with email ${email} already exists with role: ${existingUsers[0].role}`);
      const updateRole = await question('Do you want to promote this user to superadmin? (y/n): ');
      
      if (updateRole.toLowerCase() === 'y') {
        await connection.execute(
          "UPDATE users SET role = 'superadmin' WHERE id = ?",
          [existingUsers[0].id]
        );
        console.log(`\nUser ${email} has been promoted to superadmin successfully.`);
      } else {
        console.log('Operation cancelled by user.');
      }
    } else {
      // Create new superadmin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await connection.execute(
        'INSERT INTO users (email, phone, password, role) VALUES (?, ?, ?, ?)',
        [email, phone || null, hashedPassword, 'superadmin']
      );
      
      console.log(`\nSuperadmin user ${email} created successfully!`);
    }
    
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    rl.close();
  }
}

// Run the script
createSuperAdmin(); 