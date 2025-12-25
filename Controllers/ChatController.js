
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
    const { rideId, senderId, senderRole, recipientId, text, clientMessageId } = req.body;

    if (!senderId || !senderRole || !recipientId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["driver", "customer", "admin"].includes(senderRole)) {
      return res.status(400).json({ message: "Invalid sender role" });
    }

    // Allow multiple recipients (admin support)
    const recipientIds = Array.isArray(recipientId) ? recipientId : [recipientId];
    const messagesToSend = [];

    // Load recipients
    const recipients = await UserModel.find({ _id: { $in: recipientIds } });
    if (recipients.length !== recipientIds.length) {
      return res.status(404).json({ message: "One or more recipients not found" });
    }

    const hasAdminRecipient = recipients.some(u => u.role === "admin");

    let ride = null;

    // 👉 Only load ride if needed
    if (!hasAdminRecipient || senderRole === "admin") {
      if (rideId) {
        ride = await RideModel.findById(rideId);
        if (!ride) {
          return res.status(404).json({ message: "Ride not found" });
        }
      }
    }

    // 🚫 Ride status restriction (ONLY for non-admin → non-admin chat)
    if (ride && senderRole !== "admin" && !hasAdminRecipient) {
      const disallowedStatuses = ["pending", "completed", "cancelled", "failed"];
      if (disallowedStatuses.includes(ride.status)) {
        return res.status(400).json({
          message: `Chat is disabled for ride status: ${ride.status}`
        });
      }
    }

    for (const rUser of recipients) {
      // 🚨 Validation only when chatting with non-admin
      if (senderRole !== "admin" && rUser.role !== "admin") {
        const isParticipant =
          (senderRole === "driver" && ride.driverId.toString() === senderId) ||
          (senderRole === "customer" && ride.customerId.toString() === senderId);

        if (!isParticipant) {
          return res.status(403).json({
            message: "Sender is not a participant of this ride"
          });
        }

        const expectedRecipientId =
          senderRole === "driver"
            ? ride.customerId.toString()
            : ride.driverId.toString();

        if (rUser._id.toString() !== expectedRecipientId) {
          return res.status(400).json({
            message: "Invalid recipient for this ride"
          });
        }
      }

      // ✅ Create message
      const newMsg = new ChatMessage({
        rideId: ride ? ride._id : null,
        senderId,
        senderRole,
        recipientId: rUser._id,
        message: text,
        clientMessageId
      });

      await newMsg.save();

      // Socket emit
      if (req.io) {
        req.io.to(rUser._id.toString()).emit("chat-message", newMsg);
        req.io.to(senderId).emit("chat-message", newMsg);
      }

      messagesToSend.push(newMsg);
    }

    res.status(200).json({
      message: "Message sent",
      chat: messagesToSend
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({
      message: "Failed to send message",
      error: err.message
    });
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

// Get chat history (ride or support)
export const getChatHistory = async (req, res) => {
  const { rideId } = req.params; // can be "support"
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // =========================
    // 🧑‍💼 SUPPORT CHAT (no ride)
    // =========================
    if (!rideId || rideId === "support") {
      // Only admin, customer, driver allowed
      const messages = await ChatMessage.find({
        rideId: null,
        $or: [
          { senderId: userId },
          { recipientId: userId }
        ]
      }).sort({ createdAt: 1 });

      return res.status(200).json({ messages });
    }

    // =========================
    // 🚗 RIDE CHAT
    // =========================
    const ride = await RideModel.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Admin can view any ride chat
    if (userRole !== "admin") {
      const isParticipant =
        ride.driverId.toString() === userId ||
        ride.customerId.toString() === userId;

      if (!isParticipant) {
        return res.status(403).json({ message: "Access to ride chat denied" });
      }
    }

    const messages = await ChatMessage.find({ rideId })
      .sort({ createdAt: 1 });

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

// ----- support history

export const sendSupportMessage = async (req, res) => {
  try {
    const { text, recipientId, clientMessageId } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    if (!text || !recipientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["customer", "driver"].includes(senderRole)) {
      return res.status(403).json({ message: "Only customers or drivers can use support chat" });
    }

    // Validate admin recipient(s)
    const adminIds = Array.isArray(recipientId) ? recipientId : [recipientId];
    const admins = await UserModel.find({
      _id: { $in: adminIds },
      role: "admin",
    });

    if (admins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const messages = [];

    for (const admin of admins) {
      const msg = new ChatMessage({
        rideId: null,               // 🔑 SUPPORT CHAT = no ride
        senderId,
        senderRole,
        recipientId: admin._id,
        message: text,
        clientMessageId,
      });

      await msg.save();

      // Emit socket
      if (req.io) {
        req.io.to(admin._id.toString()).emit("support-message", msg);
        req.io.to(senderId).emit("support-message", msg);
      }

      messages.push(msg);
    }

    res.status(200).json({
      message: "Support message sent",
      chat: messages,
    });
  } catch (err) {
    console.error("Support send error:", err);
    res.status(500).json({ message: "Failed to send support message" });
  }
};

export const sendAdminSupportReply = async (req, res) => {
  try {
    const { text, recipientId, 
  clientMessageId, } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    if (senderRole !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    if (!text || !recipientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await UserModel.findById(recipientId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const msg = new ChatMessage({
      rideId: null,
      senderId,
      senderRole: "admin",
      recipientId,
      message: text,
  clientMessageId,
    });

    await msg.save();

    if (req.io) {
      req.io.to(recipientId.toString()).emit("support-message", msg);
      req.io.to(senderId).emit("support-message", msg);
    }

    res.status(200).json({ message: "Reply sent", chat: msg });
  } catch (err) {
    console.error("Admin support reply error:", err);
    res.status(500).json({ message: "Failed to reply" });
  }
};

// Upload support chat file
export const uploadSupportFile = async (req, res) => {
  try {
    const { senderId, senderRole, recipientId } = req.body;
    const file = req.file;
     console.log(req.body,  req.file)
    // Validate required fields
    if (!senderId || !senderRole || !recipientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    if (!["customer", "driver", "admin"].includes(senderRole)) {
  return res.status(403).json({ message: "Only customers, drivers, or admins can send support files" });
}
    // Validate admin recipient
    const adminIds = Array.isArray(recipientId) ? recipientId : [recipientId];
    const admins = await UserModel.find({ _id: { $in: adminIds }, role: "admin" });
    if (admins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Upload file to Cloudinary
    const { url, public_id } = await uploadImageToCloudinary(file.path);
    const fileType = file.mimetype.startsWith("image") ? "image" : "file";

    const messages = [];

    for (const admin of admins) {
      const newMsg = new ChatMessage({
        rideId: null,               // SUPPORT CHAT
        senderId,
        senderRole,
        recipientId: admin._id,
        fileUrl: url,
        fileType,
      });

      await newMsg.save();

      // Emit via Socket.IO
      if (req.io) {
        req.io.to(admin._id.toString()).emit("support-message", newMsg);
        req.io.to(senderId).emit("support-message", newMsg);
      }

      messages.push(newMsg);
    }

    res.status(200).json({ message: "Support file uploaded", chat: messages });
  } catch (err) {
    console.error("Support file upload error:", err);
    res.status(500).json({ message: "Failed to upload support file" });
  }
};

export const getSupportChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await ChatMessage.find({
      rideId: null,
      $or: [{ senderId: userId }, { recipientId: userId }],
    }).sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (err) {
    console.error("Support chat fetch error:", err);
    res.status(500).json({ message: "Failed to load support chat" });
  }
};