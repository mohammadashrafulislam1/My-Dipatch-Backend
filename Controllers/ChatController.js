
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
    const { rideId, senderId, senderRole, recipientId, text, 
  clientMessageId } = req.body;

    if (!senderId || !senderRole || !recipientId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["driver", "customer", "admin"].includes(senderRole)) {
      return res.status(400).json({ message: "Invalid sender role" });
    }

    const ride = await RideModel.findById(rideId);
    if (senderRole !== "admin"){if (!ride) return res.status(404).json({ message: "Ride not found" });}

    // Disallow chat for certain ride statuses (only for non-admin)
    if (senderRole !== "admin") {
      const disallowedStatuses = ["pending", "completed", "cancelled", "failed"];
      if (disallowedStatuses.includes(ride.status)) {
        return res.status(400).json({ message: `Chat is disabled for ride status: ${ride.status}` });
      }
    }

    // Allow multiple recipientIds if it's an array (for admin/customer service)
    const recipientIds = Array.isArray(recipientId) ? recipientId : [recipientId];
    const messagesToSend = [];

    for (let rId of recipientIds) {
      const recipientUser = await UserModel.findById(rId);
      if (!recipientUser) {
        return res.status(404).json({ message: `Recipient not found: ${rId}` });
      }

      // Validation for non-admin senders (customer or driver)
      if (senderRole !== "admin") {
        const isParticipant =
          (senderRole === "driver" && ride.driverId.toString() === senderId) ||
          (senderRole === "customer" && ride.customerId.toString() === senderId);

        if (!isParticipant) {
          return res.status(403).json({ message: "Sender is not a participant of this ride" });
        }

        // Recipient must be either the other participant or an admin
        const expectedRecipientId = senderRole === "driver" ? ride.customerId.toString() : ride.driverId.toString();
        if (rId !== expectedRecipientId && recipientUser.role !== "admin") {
          return res.status(400).json({ message: `Invalid recipient for this ride: ${rId}` });
        }
      } else {
        // Admin can message driver, customer, or other admin (optional)
        const validRecipient =
          ride.driverId.toString() === rId ||
          ride.customerId.toString() === rId ||
          recipientUser.role === "admin";
        if (!validRecipient) {
          return res.status(400).json({ message: `Recipient is not part of this ride: ${rId}` });
        }
      }

      // Create message object for this recipient
      const newMsg = new ChatMessage({
        rideId,
        senderId,
        senderRole,
        recipientId: rId,
        message: text,
        clientMessageId
      });

      await newMsg.save();

      // Emit via Socket.IO
      if (req.io) {
        req.io.to(rId).emit("chat-message", newMsg);
        req.io.to(senderId).emit("chat-message", newMsg);
      }

      messagesToSend.push(newMsg);
    }

    res.status(200).json({ message: "Message sent", chat: messagesToSend });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message", err: err.message });
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
      message: text, // ✅ must be text from request
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
 const userId = req.user.id;
const userRole = req.user.role;

  console.log(req.user.id)
  try {
    const ride = await RideModel.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    console.log("UserId from token:", userId);
    console.log("Ride IDs:", {
      driverId: ride.driverId.toString(),
      customerId: ride.customerId.toString(),
    });
    
    // Check if user is driver or customer of this ride
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

// ChatController.js
export const getUnreadChatCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await ChatMessage.countDocuments({
      recipientId: userId,
      read: false,
    });
    res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching unread count" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId } = req.body;

    await ChatMessage.updateMany(
      { rideId, recipientId: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error marking messages read" });
  }
};
