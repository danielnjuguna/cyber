import express from 'express';
import { 
  register, 
  login, 
  requestPasswordReset, 
  resetPassword, 
  getProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { auth, adminAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/request-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', auth, getProfile);

// Admin routes
router.get('/', auth, adminAuth, getAllUsers);
router.get('/:id', auth, adminAuth, getUserById);
router.post('/', auth, adminAuth, createUser);
router.put('/:id', auth, adminAuth, updateUser);
router.delete('/:id', auth, adminAuth, deleteUser);

export default router;
