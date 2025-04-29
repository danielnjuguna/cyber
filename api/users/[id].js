import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../../lib/db.js'; // Updated import path

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// --- Admin Authentication Check Function ---
// (Same reusable function as in api/users/index.js)
async function checkAdminAuth(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('Admin Auth Error: No token provided');
      res.status(401).json({ message: 'Authentication required' });
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      console.log(`Admin Auth Error: User ID ${decoded.id} not found`);
      res.status(401).json({ message: 'User not found or invalid token' });
      return null;
    }
    // Accept both admin and superadmin roles
    if (users[0].role !== 'admin' && users[0].role !== 'superadmin') {
      console.log(`Admin Auth Error: User ID ${decoded.id} is not an admin or superadmin`);
      res.status(403).json({ message: 'Admin access required' });
      return null;
    }
    console.log(`Admin authenticated: User ID ${decoded.id}`);
    return { ...decoded, role: users[0].role }; // Return with current role
  } catch (error) {
    console.error('Admin Auth Error:', error.message || error);
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired' });
    } else {
      res.status(401).json({ message: 'Authentication failed' });
    }
    return null;
  }
}

// --- Main Handler ---
export default async function handler(req, res) {
  // --- Check Admin Auth ---
  const authenticatedUser = await checkAdminAuth(req, res);
  if (!authenticatedUser) {
    // If auth failed, the checkAdminAuth function already sent the response
    return;
  }
  // User is authenticated as admin, proceed...

  // Get target user ID from the URL path parameter
  const targetUserId = req.query.id;
  if (!targetUserId) {
    console.log('Missing user ID in request');
    return res.status(400).json({ message: 'Missing user ID in request' });
  }

  // --- Route based on HTTP method ---
  if (req.method === 'GET') {
    // --- Handle GET: Get specific user (Admin) ---
    try {
      console.log(`GET /api/users/${targetUserId} request (admin)`);
      const [users] = await pool.execute(
        'SELECT id, email, phone, role, created_at, updated_at FROM users WHERE id = ?',
        [targetUserId]
      );

      if (!users || users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user: users[0] });
    } catch (error) {
      console.error(`Get user (${targetUserId}) error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error fetching user' });
    }

  } else if (req.method === 'PUT') {
    // --- Handle PUT: Update user (Admin) ---
    const { email, phone, password, role } = req.body;
    console.log(`PUT /api/users/${targetUserId} request (admin)`, { email, phone, role, password: password ? '******' : undefined });

    try {
      // Check if user exists (though technically redundant if GET worked, good practice)
       const [existingUsers] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
       if (!existingUsers || existingUsers.length === 0) {
           return res.status(404).json({ message: 'User not found' });
       }

      // Get the current user's role before update
      const currentUserRole = existingUsers[0].role;

      // Start building the update query
      let query = 'UPDATE users SET ';
      const params = [];
      const updateFields = [];

      if (email) {
        updateFields.push('email = ?');
        params.push(email);
      }
      if (phone !== undefined) { // Allow setting phone to null/empty
        updateFields.push('phone = ?');
        params.push(phone || null);
      }
      
      // If role change is requested, check if user is a superadmin
      if (role) {
        // If the role is being changed or if changing to superadmin, require superadmin
        if (role !== currentUserRole || role === 'superadmin') {
          // Only superadmin can change roles or assign superadmin role
          if (authenticatedUser.role !== 'superadmin') {
            return res.status(403).json({ 
              message: 'Only Super Admins can change user roles'
            });
          }
        }
        updateFields.push('role = ?');
        params.push(role);
      }
      
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        updateFields.push('password = ?');
        params.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
      }

      // Add update timestamp and WHERE clause
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      query += updateFields.join(', ') + ' WHERE id = ?';
      params.push(targetUserId);

      // Execute the update
      const [updateResult] = await pool.execute(query, params);

       if (updateResult.affectedRows === 0) {
            // Should not happen if user check passed, but handle anyway
            console.error(`Update failed for user ${targetUserId}, affectedRows was 0.`);
            // Perhaps the data didn't change, or the user disappeared between checks
            // Re-fetch to confirm status
            const [checkUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [targetUserId]);
            if (!checkUser || checkUser.length === 0) {
                return res.status(404).json({ message: 'User not found during update confirmation.' });
            }
            // If user exists but no rows affected, maybe data was identical. Send updated data anyway.
       }

      // Get updated user data (excluding password)
      const [updatedUserData] = await pool.execute(
        'SELECT id, email, phone, role, created_at, updated_at FROM users WHERE id = ?',
        [targetUserId]
      );

      if (!updatedUserData || updatedUserData.length === 0) {
        console.error(`Failed to retrieve updated user data after admin update for ID: ${targetUserId}`);
        return res.status(500).json({ message: 'Failed to retrieve user data after update' });
      }

      const updatedUser = updatedUserData[0];

      return res.status(200).json({
        message: 'User updated successfully by admin',
        user: updatedUser
      });

    } catch (error) {
      console.error(`Update user (${targetUserId}) error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      if (error.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'A user with this email already exists.' });
      }
      return res.status(500).json({ message: 'Server error updating user' });
    }

  } else if (req.method === 'DELETE') {
    // --- Handle DELETE: Delete user (Admin) ---
    console.log(`DELETE /api/users/${targetUserId} request (admin)`);

    try {
      // Check if attempting to delete a superadmin (only superadmins can delete superadmins)
      const [userToDelete] = await pool.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [targetUserId]
      );
      
      if (!userToDelete || userToDelete.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // If trying to delete a superadmin, require superadmin privileges
      if (userToDelete[0].role === 'superadmin' && authenticatedUser.role !== 'superadmin') {
        return res.status(403).json({ 
          message: 'Only Super Admins can delete Super Admin users'
        });
      }

      // Execute the delete operation
      const [result] = await pool.execute(
        'DELETE FROM users WHERE id = ?',
        [targetUserId]
      );

      // Check if the operation was successful
      if (result.affectedRows === 0) {
        console.log(`Delete failed: User ID ${targetUserId} not found or already deleted`);
        return res.status(404).json({ message: 'User not found or already deleted.' });
      }

      return res.status(200).json({ message: 'User deleted successfully' });

    } catch (error) {
      console.error(`Delete user (${targetUserId}) error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      // Handle potential foreign key constraints if users are linked elsewhere
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          return res.status(400).json({ message: 'Cannot delete user, they are referenced by other data.' });
      }
      return res.status(500).json({ message: 'Server error deleting user' });
    }

  } else {
    // Handle unsupported methods
    console.log(`Method ${req.method} not allowed for /api/users/[id]`);
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
