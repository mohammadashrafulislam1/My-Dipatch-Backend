import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Define the LocalRun directory path
const localRunDir = path.join(__dirname, '..', 'uploads', 'LocalRun');


// ✅ Ensure the LocalRun directory exists
if (!fs.existsSync(localRunDir)) {
    fs.mkdirSync(localRunDir, { recursive: true });
}

// ✅ Define the storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localRunDir); // Save to uploads/LocalRun
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`); // timestamp + sanitized filename
  }
});

// ✅ Export the multer upload instance
export const upload = multer({ storage });
