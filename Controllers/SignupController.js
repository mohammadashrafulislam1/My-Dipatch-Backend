import bcrypt from "bcrypt";
import { UserModel } from "../Model/User.js";
import { cloudinary } from "../utils/cloudinary.js";
import fs from 'fs';


// Helper function for uploading images to Cloudinary
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'localRun/profileImage'
    });
    fs.unlinkSync(filePath); // Delete the temp file after upload
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error('Cloudinary upload error:', error);  // 🔍 This helps you debug
    throw new Error('Error uploading image');
  }
};


// Create Sign Up Controller
export const CreateSignupController = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, city, password } = req.body;

    // Check if required fields are missing
    if (!firstName || !lastName || !email || !phone || !city || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
 // Validate role
 const allowedRoles = ['customer', 'driver', 'admin'];
 if (!allowedRoles.includes(role)) {
   return res.status(400).json({ message: 'Invalid role specified.' });
 }
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
 // Upload image to Cloudinary (if file provided)
 let profileImage = null;
 let public_id = null;

 if (req.file) {
   const uploadResult = await uploadImage(req.file.path);
   profileImage = uploadResult.url;
   public_id = uploadResult.public_id;
 }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the user
    const newUser = new UserModel({
      firstName,
      lastName,
      email,
      phone,
      city,
      password: hashedPassword,
      profileImage,
      public_id,
      role // ✅ include role here
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
