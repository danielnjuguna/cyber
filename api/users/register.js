// api/users/register.js
import bcrypt from 'bcryptjs';
import { pool } from '../../lib/db.js'; // Updated import path
import { generateToken } from '../../middlewares/auth.js'; // Import generateToken

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, phone, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (email, phone, password) VALUES (?, ?, ?)',
      [email, phone || null, hashedPassword]
    );

    const userId = result.insertId;

    // Get the complete user data including created_at
    const [userData] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?', // Added role
      [userId]
    );

    if (!userData || userData.length === 0) {
         // Should not happen, but handle defensively
        console.error(`Failed to retrieve user data after insert for ID: ${userId}`);
        return res.status(500).json({ message: 'Failed to retrieve user data after registration' });
    }

    const user = userData[0];

    // Generate token (include role)
    const token = generateToken({ id: userId, email: user.email, role: user.role });

    // Don't send password hash in response
    delete user.password;

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Add more specific error logging if possible
    if (error.sqlMessage) {
        console.error('SQL Error:', error.sqlMessage);
    }
    return res.status(500).json({ message: 'Server error during registration' });
  }
} 