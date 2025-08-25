import multer from 'multer';

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// Export the multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  }
});