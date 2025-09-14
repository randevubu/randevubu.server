const multer = require('multer');
import { Request } from 'express';

// Configure multer for memory storage (since we're uploading to S3)
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (
  req: Request,
  file: any,
  cb: any
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF images are allowed.'));
  }
};

// Configure multer with limits and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
});

// Export middleware for single image upload
export const uploadSingleImage = upload.single('image');

// Export middleware for multiple images (gallery)
export const uploadMultipleImages = upload.array('images', 10); // Max 10 images for gallery

// Error handling middleware for multer
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size too large. Maximum allowed size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'TOO_MANY_FILES',
        message: 'Too many files. Maximum 10 images allowed for gallery.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'UNEXPECTED_FIELD',
        message: 'Unexpected field name. Use "image" for single uploads or "images" for multiple.'
      });
    }
  }

  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_TYPE',
      message: error.message
    });
  }

  // Pass other errors to the next error handler
  next(error);
};

export default upload;