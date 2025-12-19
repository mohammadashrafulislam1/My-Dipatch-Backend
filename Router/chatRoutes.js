import express from "express";
import { deleteRideChat, getChatHistoryByRide, getUnreadChatCount, markMessagesAsRead, sendAdminMessage, sendChatMessage, uploadChatFile } from "../Controllers/ChatController.js";
import { upload } from "../Middleware/upload.js";
import { verifyToken } from "../Middleware/jwt.js";
import { ChatMessage } from "../Model/ChatMessage.js";

export const chatRouter = express.Router();
chatRouter.get("/customer/:rideId", verifyToken('customer'), getChatHistoryByRide);
chatRouter.get("/driver/:rideId", verifyToken('driver'), getChatHistoryByRide);
// Admin chat history
chatRouter.get(
  "/admin/:rideId",
  verifyToken("admin"),
  getChatHistoryByRide
);
chatRouter.post("/upload", upload.single("file"), uploadChatFile);

// Send admin message (to all, customers, drivers, or a specific user)
chatRouter.post("/admin/send", sendAdminMessage);

// Send text message
chatRouter.post("/send", sendChatMessage);

// Delete all chat messages for a completed ride (admin or system only — add auth as needed)
chatRouter.delete("/ride/:rideId", deleteRideChat);

chatRouter.get("/unread", verifyToken(), getUnreadChatCount);
chatRouter.post("/mark-read", verifyToken(), markMessagesAsRead);

// Add this route to chatRoutes.js
chatRouter.get(
  "/admin/user/:userId",
  verifyToken("admin"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user._id; // Admin ID from token
      
      console.log(`Fetching chat between admin ${adminId} and user ${userId}`);
      
      // Fetch all messages between admin and this user
      // Use $or to get messages in both directions
      const messages = await ChatMessage.find({
        $or: [
          // Admin sent to user
          { senderId: adminId, senderRole: "admin", recipientId: userId },
          // User sent to admin
          { senderId: userId, recipientId: adminId },
          // Also include any messages where admin is recipient and user is sender
          { senderId: userId, recipientId: adminId, senderRole: { $in: ["driver", "customer"] } }
        ]
      })
      .sort({ createdAt: 1 })
      .lean(); // Use lean() for better performance
      
      console.log(`Found ${messages.length} messages between admin ${adminId} and user ${userId}`);
      
      res.status(200).json({ 
        success: true, 
        messages,
        count: messages.length 
      });
      
    } catch (err) {
      console.error("Admin user chat history error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Error retrieving messages", 
        error: err.message 
      });
    }
  }
);