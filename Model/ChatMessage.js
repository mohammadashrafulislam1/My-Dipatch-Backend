// models/ChatMessage.js
import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
      rideId: { type: mongoose.Schema.Types.ObjectId, ref: "RideModel", required: true },
      senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
      senderRole: { type: String, enum: ["customer", "driver", "admin"], required: true },
      recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
      message: { type: String }, // Optional text
      fileUrl: { type: String }, // For image or file
      fileType: { type: String }, // "image", "pdf", "doc", etc.
      read: { type: Boolean, default: false },
    },
    { timestamps: true }
  );
  

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
