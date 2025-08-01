
import fs from "fs";
import { cloudinary } from "../utils/cloudinary.js";
import { ChatMessage } from "../Model/ChatMessage.js";
import { UserModel } from "../Model/User.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";

// Cloudinary uploader
const uploadImageToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "localRun/chat",
      resource_type: "auto",
    });
    fs.unlinkSync(filePath);
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Error uploading file to Cloudinary");
  }
};

// Delete chat messages when ride completes
export const deleteRideChat = async (rideId) => {
  try {
    await ChatMessage.deleteMany({ rideId });
    console.log(`Deleted chat messages for ride: ${rideId}`);
  } catch (err) {
    console.error("Chat deletion error:", err);
  }
};

// Send text message
export const sendChatMessage = async (req, res) => {
  try {
    const { rideId, senderId, senderRole, recipientId, text } = req.body;

    // Validate required fields
    if (!rideId || !senderId || !senderRole || !recipientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate roles
    if (!["driver", "customer"].includes(senderRole)) {
      return res.status(400).json({ message: "Invalid sender role" });
    }

    // Validate ride status
    const ride = await RideModel.findById(rideId);
    if (!ride || ride.status === "completed") {
      return res.status(400).json({ message: "Ride not active or completed" });
    }

    // Validate participants
    const isValidParticipant = 
      (senderRole === "driver" && ride.driverId.toString() === senderId) ||
      (senderRole === "customer" && ride.customerId.toString() === senderId);
      
    if (!isValidParticipant) {
      return res.status(403).json({ message: "Not a ride participant" });
    }

    const newMsg = new ChatMessage({
      rideId,
      senderId,
      senderRole,
      recipientId,
      text,
    });

    await newMsg.save();

    // Emit via Socket.IO
    if (req.io) {
      req.io.to(recipientId).emit("chat-message", newMsg);
      // Also emit to sender for sync across devices
      req.io.to(senderId).emit("chat-message", newMsg);
    }

    res.status(200).json({ message: "Message sent", chat: newMsg });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Upload chat file
export const uploadChatFile = async (req, res) => {
  try {
    const { rideId, senderId, senderRole, recipientId } = req.body;
    const file = req.file;

    // Validate required fields
    if (!rideId || !senderId || !senderRole || !recipientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Validate roles and ride status
    const ride = await RideModel.findById(rideId);
    if (!ride || ride.status === "completed") {
      return res.status(400).json({ message: "Ride not active or completed" });
    }

    // Validate participants
    const isValidParticipant = 
      (senderRole === "driver" && ride.driverId.toString() === senderId) ||
      (senderRole === "customer" && ride.customerId.toString() === senderId);
      
    if (!isValidParticipant) {
      return res.status(403).json({ message: "Not a ride participant" });
    }

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

    // Emit via Socket.IO
    if (req.io) {
      req.io.to(recipientId).emit("chat-message", newMsg);
      // Also emit to sender
      req.io.to(senderId).emit("chat-message", newMsg);
    }

    res.status(200).json({ message: "File uploaded", chat: newMsg });
  } catch (err) {
    console.error("Upload chat file error:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
};

// Admin messaging
export const sendAdminMessage = async (req, res) => {
  try {
    const { text, recipientType, recipientId } = req.body;
    const senderId = req.user._id; // Authenticated admin user

    // Validate admin role (pseudo-code)
    // if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });

    if (!text) return res.status(400).json({ message: "Message text required" });
    
    // Validate recipient parameters
    const validRecipientTypes = ["all", "customers", "drivers", "user"];
    if (!validRecipientTypes.includes(recipientType)) {
      return res.status(400).json({ message: "Invalid recipient type" });
    }

    if (recipientType === "user" && !recipientId) {
      return res.status(400).json({ message: "Recipient ID required" });
    }

    // For user-specific messages, validate ride status
    if (recipientType === "user") {
      const user = await UserModel.findById(recipientId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Check active rides with valid statuses
      const validStatuses = ["pending", "accepted", "on_the_way", "in_progress", "cancelled"];
      const activeRide = await RideModel.findOne({
        $or: [{ customerId: recipientId }, { driverId: recipientId }],
        status: { $in: validStatuses }
      });

      if (!activeRide) {
        return res.status(400).json({ message: "User has no active rides" });
      }
    }

    // Create message
    const newMsg = new ChatMessage({
      senderId,
      senderRole: "admin",
      recipientId: recipientType === "user" ? recipientId : null,
      recipientType,
      text
    });

    await newMsg.save();

    // Emit via Socket.IO
    if (req.io) {
      switch (recipientType) {
        case "user":
          req.io.to(recipientId).emit("admin-message", newMsg);
          break;
        case "customers":
          req.io.to("customer-room").emit("admin-message", newMsg);
          break;
        case "drivers":
          req.io.to("driver-room").emit("admin-message", newMsg);
          break;
        case "all":
          req.io.emit("admin-message", newMsg);
          break;
      }
    }

    res.status(200).json({ message: "Admin message sent", chat: newMsg });
  } catch (err) {
    console.error("Admin message error:", err);
    res.status(500).json({ message: "Failed to send admin message" });
  }
};

// Get chat history
export const getChatHistoryByRide = async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id; // Authenticated user

  try {
    const ride = await RideModel.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Verify user is ride participant
    const isParticipant = 
      ride.driverId.toString() === userId || 
      ride.customerId.toString() === userId;
    
    if (!isParticipant) {
      return res.status(403).json({ message: "Access to ride chat denied" });
    }

    const messages = await ChatMessage.find({ rideId }).sort({ createdAt: 1 });
    res.status(200).json({ messages });
  } catch (err) {
    console.error("Chat fetch error:", err);
    res.status(500).json({ message: "Error retrieving messages" });
  }
};