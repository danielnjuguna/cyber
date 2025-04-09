import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../config/db.js';
import { generateToken } from '../middlewares/auth.js';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email
    pass: process.env.EMAIL_PASSWORD || 'your-app-specific-password', // Replace with your app password
  },
});

// Register a new user
export const register = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      res.status(400).json({ message: 'User already exists' });
      return;
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
      'SELECT id, email, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    const user = userData[0];

    // Generate token
    const token = generateToken({ id: userId, email });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user with all necessary fields
    const [users] = await pool.execute(
      'SELECT id, email, phone, password, role, created_at FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const user = users[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken({ id: user.id, email, role: user.role });

    // Remove password from user object
    delete user.password;

    res.status(200).json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(`Password reset requested for email: ${email}`);
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    console.log(`Found users for email ${email}:`, users);

    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    console.log(`User found: ID ${user.id}`);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    console.log('Reset token generated');

    // Set token expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 3600000);

    try {
      // Check if password_reset_tokens table exists
      await pool.execute('SHOW TABLES LIKE "password_reset_tokens"');
      console.log('password_reset_tokens table exists');
    } catch (dbError) {
      console.error('Error checking for password_reset_tokens table:', dbError);
      
      // Create the table if it doesn't exist
      try {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('Created password_reset_tokens table');
      } catch (createTableError) {
        console.error('Failed to create password_reset_tokens table:', createTableError);
        return res.status(500).json({ 
          message: 'Server error: Unable to create reset token table',
          error: createTableError.message
        });
      }
    }

    try {
      // Delete any existing tokens for this user
      await pool.execute(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [user.id]
      );
      console.log(`Deleted existing tokens for user ID ${user.id}`);

      // Save token to database
    await pool.execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, hashedToken, expiresAt]
      );
      console.log('Token saved to database');
    } catch (tokenDbError) {
      console.error('Error saving token to database:', tokenDbError);
      return res.status(500).json({ 
        message: 'Server error: Unable to save reset token',
        error: tokenDbError.message
      });
    }

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log(`Reset URL created: ${resetUrl}`);

    // Send email
    let emailSent = false;
    try {
      const mailOptions = {
        from: {
          name: "CyberDocs",
          address: process.env.EMAIL_USER || 'support@cyberdocs.com'
        },
        to: user.email,
        subject: 'Password Reset Request - CyberDocs',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - CyberDocs</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333333;
                margin: 0;
                padding: 0;
                background-color: #f7f9fc;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #e0e6ed;
              }
              .logo {
                width: 180px;
                height: auto;
              }
              h1 {
                color: #0056b3;
                margin-top: 0;
                font-size: 24px;
              }
              .content {
                padding: 20px 0;
              }
              p {
                margin-bottom: 16px;
                color: #4a5568;
              }
              .btn {
                display: inline-block;
                background-color: #0056b3;
                color: #ffffff !important;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 4px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
                transition: background-color 0.3s;
              }
              .btn:hover {
                background-color: #003d82;
              }
              .btn-container {
                text-align: center;
                margin: 30px 0;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e0e6ed;
                font-size: 12px;
                color: #718096;
              }
              .info {
                background-color: #e8f4fd;
                border-left: 4px solid #0056b3;
                padding: 10px 15px;
                margin: 20px 0;
                border-radius: 0 4px 4px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <!-- You can replace this with your actual logo URL -->
                <h1>CyberDocs</h1>
                <p style="margin-top: -10px; color: #718096;">Secure Document Access Solutions</p>
              </div>
              
              <div class="content">
                <h1>Password Reset Request</h1>
                <p>Hello,</p>
                <p>We received a request to reset your password for your CyberDocs account. To complete the password reset process, please click on the button below:</p>
                
                <div class="btn-container">
                  <a href="${resetUrl}" class="btn">Reset Your Password</a>
                </div>
                
                <div class="info">
                  <p style="margin: 0;"><strong>Note:</strong> This password reset link will expire in 1 hour for security reasons.</p>
                </div>
                
                <p>If you did not request this password reset, please ignore this email or contact our support team immediately if you believe your account may be compromised.</p>
                
                <p>Need assistance? Contact our support team at <a href="mailto:support@cyberdocs.com" style="color: #0056b3;">support@cyberdocs.com</a></p>
              </div>
              
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} CyberDocs. All rights reserved.</p>
                <p>Your trusted platform for secure document management and cyber services.</p>
                <p>This is an automated message, please do not reply directly to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
      emailSent = true;
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue with response even if email fails
    }

    // In development, return the token for testing
    if (process.env.NODE_ENV === 'development') {
      return res.json({ 
        message: emailSent ? 'Reset link sent to email' : 'Reset link generated but email failed', 
        token: resetToken,
        resetUrl: resetUrl
      });
    }

    // In production, don't return the token
    res.json({ 
      message: emailSent ? 
        'Reset link sent to email' : 
        'Password reset requested. If your email is registered, you will receive reset instructions.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset request',
      error: error.message
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    console.log('Password reset requested with token');
    
    if (!token || !newPassword) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Hash the token from the request
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log('Token hashed for database lookup');

    try {
      // Check if password_reset_tokens table exists
      await pool.execute('SHOW TABLES LIKE "password_reset_tokens"');
      console.log('password_reset_tokens table exists');
    } catch (dbError) {
      console.error('Error checking for password_reset_tokens table:', dbError);
      return res.status(500).json({ 
        message: 'Server error: Reset token table does not exist',
        error: dbError.message
      });
    }

    // Find valid token in database
    let tokens;
    try {
      [tokens] = await pool.execute(
        'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
        [hashedToken]
      );
      console.log('Token lookup result:', tokens);
      
      // Check if token is expired
      if (tokens.length > 0) {
        const expiryDate = new Date(tokens[0].expires_at);
        const now = new Date();
        if (expiryDate < now) {
          console.log('Token expired');
          return res.status(400).json({ message: 'Reset token has expired' });
        }
      }
    } catch (tokenLookupError) {
      console.error('Error looking up token:', tokenLookupError);
      return res.status(500).json({ 
        message: 'Server error: Unable to verify reset token',
        error: tokenLookupError.message
      });
    }

    if (!tokens || !tokens.length) {
      console.log('Invalid token - not found in database');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const { user_id } = tokens[0];
    console.log(`Valid token found for user ID: ${user_id}`);

    // Hash new password
    let hashedPassword;
    try {
    const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(newPassword, salt);
      console.log('New password hashed');
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      return res.status(500).json({ 
        message: 'Server error: Unable to process new password',
        error: hashError.message
      });
    }

    // Update user's password
    try {
      await pool.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, user_id]
      );
      console.log(`Password updated for user ID: ${user_id}`);
    } catch (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ 
        message: 'Server error: Unable to update password',
        error: updateError.message
      });
    }

    // Delete used token
    try {
    await pool.execute(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [user_id]
    );
      console.log(`Token deleted for user ID: ${user_id}`);
    } catch (deleteError) {
      console.error('Error deleting token:', deleteError);
      // Continue even if token deletion fails
    }

    console.log('Password reset successful');
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const [users] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.status(200).json({
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin endpoints

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    // Get all users, excluding passwords
    const [users] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.status(200).json({
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user data
    const [users] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.status(200).json({
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new user (admin)
export const createUser = async (req, res) => {
  const { email, phone, password, role } = req.body;

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

    // Create user with specified role
    const [result] = await pool.execute(
      'INSERT INTO users (email, phone, password, role) VALUES (?, ?, ?, ?)',
      [email, phone || null, hashedPassword, role || 'user']
    );

    const userId = result.insertId;

    // Get the complete user data
    const [userData] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    const user = userData[0];

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { email, phone, password, role } = req.body;

  try {
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Start building the update query
    let query = 'UPDATE users SET ';
    const params = [];
    const updateFields = [];

    // Add fields that are provided
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }

    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone || null);
    }

    if (role) {
      updateFields.push('role = ?');
      params.push(role);
    }

    if (password) {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Complete the query
    query += updateFields.join(', ') + ' WHERE id = ?';
    params.push(userId);

    // Execute the update
    await pool.execute(query, params);

    // Get updated user data
    const [updatedUserData] = await pool.execute(
      'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = updatedUserData[0];

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
