import express from "express";
import { deleteRideChat, getChatHistoryByRide, getUnreadChatCount, markMessagesAsRead, sendAdminMessage, sendChatMessage, uploadChatFile } from "../Controllers/ChatController.js";
import { upload } from "../Middleware/upload.js";
import { verifyToken } from "../Middleware/jwt.js";

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
      const adminId = req.user._id;
      
      // Fetch all messages between admin and this user
      const messages = await ChatMessage.find({
        $or: [
          { senderId: adminId, recipientId: userId },
          { senderId: userId, recipientId: adminId }
        ],
        // Also include messages where admin is sender/recipient with this user
        $or: [
          { senderRole: "admin" },
          { recipientId: userId }
        ]
      }).sort({ createdAt: 1 });
      
      res.status(200).json({ messages });
    } catch (err) {
      console.error("Admin user chat history error:", err);
      res.status(500).json({ message: "Error retrieving messages" });
    }
  }
);