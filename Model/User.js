import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    city: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    public_id: {
      type: String,
    },
    role: {
      type: String,
      enum: ['customer', 'driver', 'admin'], // allowed roles
      default: 'rider', // default role if not specified
    },
  }, { timestamps: true });
  
export const UserModel  = mongoose.model('User', userSchema);
