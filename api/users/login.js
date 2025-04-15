// api/users/login.js
import bcrypt from 'bcryptjs';
import { pool } from '../../lib/db.js'; // Updated import path
import { generateToken } from '../../middlewares/auth.js'; // Import generateToken

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password } = req.body;
  console.log(`🔐 Login attempt for email: ${email}`);

  try {
    // Validate input
    if (!email || !password) {
      console.log('   ❌ Validation Error: Email or password missing');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user with all necessary fields
    console.log(`   🔍 Finding user in DB...`);
    const [users] = await pool.execute(
      'SELECT id, email, phone, password, role, created_at FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      console.log(`   ❌ User not found: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' }); // Keep message generic for security
    }

    const user = users[0];
    console.log(`   ✅ User found: ID ${user.id}, Role ${user.role}`);
    console.log(`   🔑 Stored password hash: ${user.password ? user.password.substring(0, 10) + '...' : 'MISSING!'}`);

    // Validate password
    console.log(`   🔄 Comparing provided password with stored hash...`);
    const isMatch = await bcrypt.compare(password, user.password || ''); // Compare with hash or empty string if missing
    console.log(`   Password Match Result: ${isMatch}`);

    if (!isMatch) {
      console.log(`   ❌ Password mismatch for user ID ${user.id}`);
      return res.status(400).json({ message: 'Invalid credentials' }); // Keep message generic
    }

    // Generate token (include role)
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Remove password from user object before sending response
    delete user.password;

    return res.status(200).json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
     if (error.sqlMessage) {
        console.error('SQL Error:', error.sqlMessage);
    }
    return res.status(500).json({ message: 'Server error during login' });
  }
} 