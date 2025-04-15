import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../../lib/db.js'; // Updated import path

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { token, newPassword } = req.body;

  try {
    console.log('Password reset submission received');

    if (!token || !newPassword) {
      console.log('Missing required fields: token or newPassword');
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Hash the token from the request to match the one in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log('Token hashed for database lookup');

    // Find valid token in database
    let tokens;
    try {
      [tokens] = await pool.execute(
        'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
        [hashedToken]
      );
      console.log('Token lookup result:', tokens ? tokens.length : 'undefined');

    } catch (tokenLookupError) {
      console.error('Error looking up token in DB:', tokenLookupError);
      return res.status(500).json({
        message: 'Server error: Unable to verify reset token',
        error: process.env.NODE_ENV === 'development' ? tokenLookupError.message : undefined,
      });
    }

    if (!tokens || !tokens.length) {
      console.log('Invalid token - not found in database');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    const expiryDate = new Date(tokens[0].expires_at);
    const now = new Date();
    if (expiryDate < now) {
      console.log('Token expired');
       // Attempt to delete the expired token
       try {
           await pool.execute('DELETE FROM password_reset_tokens WHERE token = ?', [hashedToken]);
           console.log('Expired token deleted.');
       } catch(deleteError) {
           console.error('Failed to delete expired token:', deleteError);
       }
      return res.status(400).json({ message: 'Reset token has expired' });
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
      console.error('Error hashing new password:', hashError);
      return res.status(500).json({
        message: 'Server error: Unable to process new password',
        error: process.env.NODE_ENV === 'development' ? hashError.message : undefined,
      });
    }

    // Update user's password
    try {
      const [updateResult] = await pool.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, user_id]
      );
      if(updateResult.affectedRows === 0) {
          // This shouldn't happen if the token was valid, but check defensively
          console.error(`Failed to update password for user ID ${user_id}. User might not exist.`);
          return res.status(404).json({ message: 'User associated with token not found.' });
      }
      console.log(`Password updated successfully for user ID: ${user_id}`);
    } catch (updateError) {
      console.error('Error updating password in DB:', updateError);
      return res.status(500).json({
        message: 'Server error: Unable to update password',
        error: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
      });
    }

    // Delete used token
    try {
      await pool.execute(
        'DELETE FROM password_reset_tokens WHERE user_id = ?', // Delete all tokens for the user for security
        [user_id]
      );
      console.log(`Tokens deleted for user ID: ${user_id}`);
    } catch (deleteError) {
      console.error('Error deleting used token(s): ', deleteError);
      // Log error but continue, password reset was successful
    }

    console.log('Password reset process completed successfully');
    return res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Password reset main error:', error);
    return res.status(500).json({
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
} 