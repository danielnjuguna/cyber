import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../../lib/db.js'; // Updated import path

// Email configuration (ensure environment variables are set in Vercel)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // Make service configurable
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
  },
});

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email } = req.body;

  try {
    console.log(`Password reset requested for email: ${email}`);

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) {
        // Important: Don't reveal if the email exists or not for security
        console.log(`Password reset requested for non-existent email: ${email}`);
        // Still return a success-like message to prevent email enumeration
        return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });
    }

    const user = users[0];
    console.log(`User found: ID ${user.id}`);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    console.log('Reset token generated');

    // Set token expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // --- Save Token ---
    try {
      // Delete any existing tokens for this user first
      await pool.execute(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [user.id]
      );
      console.log(`Deleted existing tokens for user ID ${user.id}`);

      // Save the new token
      await pool.execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, hashedToken, expiresAt]
      );
      console.log('Token saved to database');
    } catch (tokenDbError) {
      console.error('Error saving token to database:', tokenDbError);
      // If saving the token fails, we can't proceed
      return res.status(500).json({
        message: 'Server error: Unable to process reset request.',
        error: process.env.NODE_ENV === 'development' ? tokenDbError.message : undefined,
      });
    }

    // --- Send Email ---
    // Create reset URL (ensure FRONTEND_URL is set in Vercel)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log(`Reset URL created: ${resetUrl}`);

    let emailSent = false;
    try {
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || "CyberDocs",
          address: process.env.EMAIL_USER
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
              /* Basic inline styles for better email client compatibility */
              body { font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f7f9fc; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e6ed; }
              h1 { color: #0056b3; margin-top: 0; font-size: 24px; }
              .content { padding: 20px 0; }
              p { margin-bottom: 16px; color: #4a5568; }
              .btn { display: inline-block; background-color: #0056b3; color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; text-align: center; margin: 20px 0; }
              .btn-container { text-align: center; margin: 30px 0; }
              .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e0e6ed; font-size: 12px; color: #718096; }
              .info { background-color: #e8f4fd; border-left: 4px solid #0056b3; padding: 10px 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>CyberDocs</h1></div>
              <div class="content">
                <h1>Password Reset Request</h1>
                <p>Hello,</p>
                <p>We received a request to reset your password for your CyberDocs account associated with this email address. To complete the password reset process, please click the button below:</p>
                <div class="btn-container"><a href="${resetUrl}" class="btn" style="color: #ffffff;">Reset Your Password</a></div>
                <div class="info"><p style="margin: 0;">This link will expire in 1 hour.</p></div>
                <p>If you did not request this reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
              <div class="footer"><p>&copy; ${new Date().getFullYear()} CyberDocs. All rights reserved.</p></div>
            </div>
          </body>
          </html>
        `
      };
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent successfully to ${user.email}`);
      emailSent = true;
    } catch (emailError) {
      console.error(`Error sending password reset email to ${user.email}:`, emailError);
      // Log the error, but don't expose failure details to the client
      // We still want to return the success message to avoid info leaks
    }

    // Consistent success response regardless of email success/failure or user existence
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link.' });

  } catch (error) {
    console.error('Password reset request main error:', error);
    // Generic error for unexpected issues
     return res.status(500).json({
        message: 'Server error processing request.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
     });
  }
} 