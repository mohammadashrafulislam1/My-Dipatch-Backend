import multer from "multer";

// ✅ Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// ✅ Export the multer upload instance
export const upload = multer({ storage });
