import express from 'express';
import { getAllServices, getServiceById, createService, updateService, deleteService } from '../controllers/serviceController.js';
import { auth, adminAuth } from '../middlewares/auth.js';
import { uploadImage } from '../utils/fileUpload.js';

const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Protected routes - admin only
router.post('/', adminAuth, uploadImage.single('image'), createService);
router.put('/:id', adminAuth, uploadImage.single('image'), updateService);
router.delete('/:id', adminAuth, deleteService);

export default router;
