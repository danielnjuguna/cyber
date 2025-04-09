import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories if they don't exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create directories
createDirIfNotExists('./uploads/images');
createDirIfNotExists('./uploads/documents');
createDirIfNotExists('./uploads/thumbnails');

// Configure storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/images');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

// Configure storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/documents');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

// Configure storage for thumbnails
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/thumbnails');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedFileTypes = /pdf|doc|docx|txt|rtf|odt/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only document files are allowed!'));
  }
};

// Create upload instances
export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: documentFileFilter
});

export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter
});
