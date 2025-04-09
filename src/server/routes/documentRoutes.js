import express from 'express';
import { getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument } from '../controllers/documentController.js';
import { auth, adminAuth } from '../middlewares/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directories exist
const ensureDirectoriesExist = () => {
    const directories = ['uploads', 'uploads/documents', 'uploads/thumbnails'];
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

ensureDirectoriesExist();

// Configure storage for document files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'thumbnail') {
            cb(null, 'uploads/thumbnails/');
        } else if (file.fieldname === 'document') {
            cb(null, 'uploads/documents/');
        }
    },
    filename: function (req, file, cb) {
        // Create a safe filename by replacing spaces and special characters
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${Date.now()}-${originalName}`);
    }
});

// File filter to check allowed file types
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
        // For thumbnails, only allow images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Thumbnail must be an image file'), false);
        }
    } else if (file.fieldname === 'document') {
        // For documents, allow PDFs, Office docs, and images
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.oasis.opendocument.spreadsheet',
            'application/vnd.oasis.opendocument.presentation'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported document format'), false);
        }
    } else {
        cb(new Error('Unexpected field name'), false);
    }
};

// Set up multer with file size limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
    }
});

const router = express.Router();

// Public routes
router.get('/', getAllDocuments);
router.get('/:id', getDocumentById);

// Protected routes - admin only
router.post('/', adminAuth, upload.fields([{ name: 'document', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), createDocument);
router.put('/:id', adminAuth, upload.fields([{ name: 'document', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), updateDocument);
router.delete('/:id', adminAuth, deleteDocument);

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 25MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
        // An unknown error occurred
        return res.status(500).json({ message: err.message });
    }
    next();
});

export default router;
