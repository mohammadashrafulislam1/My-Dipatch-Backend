import { ChatMessage } from "../Model/ChatMessage.js";
import { cloudinary } from "../utils/cloudinary.js";
import fs from "fs";

// Cloudinary uploader
const uploadImageToCloudinary = async (filePath) => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "localRun/chat",
        resource_type: "auto", // handles images, pdf, docs etc.
      });
      fs.unlinkSync(filePath); // Remove local temp file
      return { url: result.secure_url, public_id: result.public_id };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Error uploading file to Cloudinary");
    }
  };


  export const uploadChatFile = async (req, res) => {
    try {
      const { rideId, senderId, senderRole, recipientId } = req.body;
      const file = req.file;
  
      if (!file) return res.status(400).json({ message: "No file uploaded" });
  
      const { url } = await uploadImageToCloudinary(file.path);
      const fileType = file.mimetype.startsWith("image") ? "image" : "file";
  
      const newMsg = new ChatMessage({
        rideId,
        senderId,
        senderRole,
        recipientId,
        fileUrl: url,
        fileType,
      });
  
      await newMsg.save();
  
      if (req.io) {
        req.io.to(recipientId).emit("chat-message", newMsg);
      }
  
      res.status(200).json({ message: "Chat file uploaded", chat: newMsg });
    } catch (err) {
      console.error("Upload chat file error:", err);
      res.status(500).json({ message: "Failed to upload chat file" });
    }
  };

export const getChatHistoryByRide = async (req, res) => {
  const { rideId } = req.params;

  try {
    const messages = await ChatMessage.find({ rideId }).sort({ createdAt: 1 });
    res.status(200).json({ messages });
  } catch (err) {
    console.error("Chat fetch error:", err);
    res.status(500).json({ message: "Error retrieving chat messages." });
  }
};
