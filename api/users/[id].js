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
    if (users[0].role !== 'admin') {
      console.log(`Admin Auth Error: User ID ${decoded.id} is not an admin`);
      res.status(403).json({ message: 'Admin access required' });
      return null;
    }
    console.log(`Admin authenticated: User ID ${decoded.id}`);
    return decoded;
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
  // --- Check Admin Auth (Ensures requester is at least admin) ---
  const authenticatedUser = await checkAdminAuth(req, res);
  if (!authenticatedUser) {
    return; // Response already sent
  }

  // --- Get target user ID ---
  const { id: userId } = req.params; 
  console.log(`Request received for user ID: ${userId}, Method: ${req.method}`);

  if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ message: 'Invalid user ID provided' });
  }
  const targetUserId = parseInt(userId);

  // --- Route based on HTTP method ---
  if (req.method === 'GET') {
    // --- Handle GET: Get user by ID (Admin) ---
    try {
      const [users] = await pool.execute(
        'SELECT id, email, phone, role, created_at FROM users WHERE id = ?',
        [targetUserId]
      );

      if (!Array.isArray(users) || users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const user = users[0];
      return res.status(200).json({ user });

    } catch (error) {
      console.error(`Get user by ID (${targetUserId}) error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      return res.status(500).json({ message: 'Server error fetching user' });
    }

  } else if (req.method === 'PUT') {
    // --- Handle PUT: Update user (Admin/Superadmin) ---
    const { email, phone, password, role } = req.body;
    console.log(`PUT /api/users/${targetUserId} request`, { requestedRole: role, adminId: authenticatedUser.id });

    // *** Superadmin Check for ROLE CHANGE to admin/superadmin ***
    if (role && (role === 'admin' || role === 'superadmin') && authenticatedUser.role !== 'superadmin') {
      console.log(`   ❌ Permission Denied: Admin ID ${authenticatedUser.id} (Role: ${authenticatedUser.role}) attempted to set role '${role}' for user ${targetUserId}. Superadmin required.`);
      return res.status(403).json({ message: 'Only superadmins can assign or change roles to admin or superadmin.' });
    }
    // *** End Superadmin Check ***

    // Validate role if provided
    if (role) {
        const allowedRoles = ['user', 'staff', 'admin', 'superadmin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: `Invalid role specified. Allowed roles: ${allowedRoles.join(', ')}` });
        }
    }

    try {
      // Check if user exists (though technically redundant if GET worked, good practice)
       const [existingUsers] = await pool.execute('SELECT id FROM users WHERE id = ?', [targetUserId]);
       if (!existingUsers || existingUsers.length === 0) {
           return res.status(404).json({ message: 'User not found' });
       }

      // Start building the update query
      let query = 'UPDATE users SET ';
      const params = [];
      const updateFields = [];

      if (email) {
        // Optional: Add validation for email format if needed
        updateFields.push('email = ?');
        params.push(email);
      }
      if (phone !== undefined) { // Allow setting phone to null/empty
        updateFields.push('phone = ?');
        params.push(phone || null);
      }
      if (role) {
        // Optional: Add validation for role enum ('user', 'admin')
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
          console.error(`Failed to retrieve user ${targetUserId} after update.`);
          return res.status(404).json({ message: 'User not found after update.' });
      }

      return res.status(200).json({
        message: 'User updated successfully',
        user: updatedUserData[0]
      });

    } catch (error) {
      console.error(`Update user (${targetUserId}) error:`, error);
      if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
      if (error.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Another user with this email already exists.' });
      }
      return res.status(500).json({ message: 'Server error updating user' });
    }

  } else if (req.method === 'DELETE') {
    // --- Handle DELETE: Delete user (Admin/Superadmin) ---
    console.log(`DELETE /api/users/${targetUserId} request by admin ${authenticatedUser.id}`);
    try {
       // Check if target user exists and get their role
       const [targetUsers] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
       if (!targetUsers || targetUsers.length === 0) {
           return res.status(404).json({ message: 'User to be deleted not found' });
       }
       const targetUserRole = targetUsers[0].role;

       // *** Superadmin Check for DELETING admin/superadmin ***
       if ((targetUserRole === 'admin' || targetUserRole === 'superadmin') && authenticatedUser.role !== 'superadmin') {
           console.log(`   ❌ Permission Denied: Admin ID ${authenticatedUser.id} (Role: ${authenticatedUser.role}) attempted to delete user ${targetUserId} (Role: ${targetUserRole}). Superadmin required.`);
           return res.status(403).json({ message: 'Only superadmins can delete admin or superadmin users.' });
       }
       // *** End Superadmin Check ***
       
       // Allow admin/superadmin to delete 'user' or 'staff' roles
       console.log(`   ✅ Permission granted: Admin ${authenticatedUser.id} deleting user ${targetUserId} (Role: ${targetUserRole})`);

      // Delete user
      const [deleteResult] = await pool.execute('DELETE FROM users WHERE id = ?', [targetUserId]);

      if (deleteResult.affectedRows === 0) {
          console.error(`Delete failed for user ${targetUserId}, affectedRows was 0.`);
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
