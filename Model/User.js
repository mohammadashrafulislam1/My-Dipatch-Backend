import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
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
      default: 'driver', // default role if not specified
    },
    // ✅ New field for driver status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: undefined // we’ll set it manually for drivers
  },
  isActive:{
    type: Boolean,
    default: false,
  },
    rating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  }, { timestamps: true });
  
export const UserModel  = mongoose.model('User', userSchema);
