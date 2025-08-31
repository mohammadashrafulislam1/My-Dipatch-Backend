import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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
    // 💡 Re-throw the error with a more specific message if it's an 'Empty file' error
    if (error.http_code === 400 && error.message.includes('Empty file')) {
      throw new Error('Uploaded file is empty or invalid.');
    }
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
      // 💡 If user already exists, and an image was uploaded, remove the temp file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "User with the same email already exists." });
    }

    // 4. Upload profile image (optional)
    let profileImage, public_id;
    if (req.file) {
      // ✅ Added check for file size
      if (req.file.size === 0) {
        fs.unlinkSync(req.file.path); // Remove the empty temp file
        return res.status(400).json({ message: 'Uploaded image file cannot be empty.' });
      }
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
      role,
      ...(role === 'driver' && { status: 'inactive' }) // ✅ Only for drivers
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
      newUser,
      token
    });

  } catch (err) {
    console.error('Signup error:', err);
    // 💡 Refined error message for specific upload issues
    if (err.message === 'Uploaded file is empty or invalid.') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
    // 💡 Ensure temp file is cleaned up even on generic server error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Log in
// export const login = async (req, res) => {
//   const { email, password } = req.body;
//   console.log(req.body)
//   const user = await UserModel.findOne({ email });

//   if (!user) {
//     return res.status(400).json({ message: 'Not Get User In DataBase' });
//   }
//     // Compare Secured (hashed) Password with provided password
//     const passwordMatch = await bcrypt.compare(password, user.password);

//     // check is the provided password match with user password
//     if (!passwordMatch) {
//       return res.status(404).json({ error: "Invalid password" });
//     }
    
//     //  JWT
//     const token = jwt.sign(
//       { email: user.email, id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN }
//     );

//   res.json({user, token });
// };
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // ✅ Send as HttpOnly cookie instead of JSON
  res.cookie("token", token, {
    httpOnly: true, // JS cannot read it (prevents XSS)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    maxAge: 1000 * 60 * 60, // 1 hour
  });

  res.json({
    success: true,
    message: "Logged in successfully",
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
};
// Get current user:
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.decoded.id || req.decoded.userId);
    console.log("user", req.decoded)
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Get all users:
export const getUsers = async (req, res) =>{
  try{
   const users = await UserModel.find();
   res.status(200).json(users)
  }
  catch (e){
    res.status(500).json({message:"Internal Server Error."})
  }
}

// Change user status (admin only)
export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== 'driver') {
      return res.status(400).json({ message: "Status can only be updated for drivers." });
    }
    

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ message: `Driver status updated to ${status}.`, user });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.json({ success: true, message: "Logged out" });
};


// Delete user with id:
export const deleteUser = async (req, res) =>{
  const id = req.params.id;
  try{
  const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
          // 🔥 Delete image from Cloudinary if public_id exists
    if (user.public_id) {
      await cloudinary.uploader.destroy(user.public_id);
    }

      await UserModel.findByIdAndDelete(id);
    res.status(200).json({ message: "User successfully deleted." });
  }
  catch (e){
    res.status(500).json({message:"Internal Server Error."})
  }
}
