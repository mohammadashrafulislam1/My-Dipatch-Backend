import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // 🔥 You forgot this!
import fs from "fs";
import { UserModel } from "../Model/User.js";
import { cloudinary } from "../utils/cloudinary.js";

// Cloudinary uploader
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'localRun/profileImage'
    });
    fs.unlinkSync(filePath); // Remove temp file
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Error uploading image');
  }
};

// Signup Controller
export const CreateSignupController = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, city, password, role } = req.body;

    // 1. Validate input
    if (!firstName || !lastName || !email || !phone || !city || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const emailToCheck = email.toLowerCase();

    // 3. Check if user exists
    const existingUserWithEmail = await UserModel.findOne({ email: emailToCheck });
  if (existingUserWithEmail) {
    return res.status(400).json({ error: "User with the same email already exists." });
  }

    // 4. Upload profile image (optional)
    let profileImage, public_id;
    if (req.file) {
      const uploadResult = await uploadImage(req.file.path);
      profileImage = uploadResult.url;
      public_id = uploadResult.public_id;
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Create user
    const newUser = new UserModel({
      firstName,
      lastName,
      email: emailToCheck,
      phone,
      city,
      password: hashedPassword,
      profileImage,
      public_id,
      role
    });

    await newUser.save();

    // 7. Create JWT
    const token = jwt.sign(
      { _id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 8. Respond
    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      token
    });
    

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
