import express from "express";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

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

chatRouter.get(
  "/admin/user/:userId",
  verifyToken("admin"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user._id;
      
      console.log(`=== CHAT HISTORY REQUEST ===`);
      console.log(`Admin ID: ${adminId}`);
      console.log(`User ID: ${userId}`);
      
      // Convert string IDs to ObjectIds
      const adminObjectId = new ObjectId(adminId);
      const userObjectId = new ObjectId(userId);
      
      // Find rides involving this user (as driver or customer)
      const rides = await RideModel.find({
        $or: [
          { driverId: userObjectId },
          { customerId: userObjectId }
        ]
      }).select('_id');
      
      const rideIds = rides.map(ride => ride._id);
      console.log(`Found ${rideIds.length} rides for user ${userId}:`, rideIds);
      
      // Query messages:
      // 1. Direct admin-to-user messages (if you implement separate admin chat)
      // 2. Messages from rides involving this user where admin participated
      const messages = await ChatMessage.find({
        $or: [
          // Direct admin-user messages
          {
            $or: [
              { senderId: adminObjectId, recipientId: userObjectId },
              { senderId: userObjectId, recipientId: adminObjectId }
            ]
          },
          // Messages from user's rides where admin was sender
          {
            senderId: adminObjectId,
            rideId: { $in: rideIds }
          },
          // Messages from user's rides where user was participant
          {
            $and: [
              { rideId: { $in: rideIds } },
              {
                $or: [
                  { senderId: userObjectId },
                  { recipientId: userObjectId }
                ]
              }
            ]
          }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();
      
      console.log(`Found ${messages.length} messages total`);
      
      // Debug logging
      if (messages.length > 0) {
        console.log("Sample messages:");
        messages.slice(0, 5).forEach((msg, i) => {
          console.log(`[${i + 1}]`, {
            _id: msg._id?.toString(),
            senderId: msg.senderId?.toString(),
            recipientId: msg.recipientId?.toString(),
            rideId: msg.rideId?.toString(),
            message: msg.message?.substring(0, 50) || '[file/empty]'
          });
        });
      }
      
      // Format response
      const formattedMessages = messages.map(msg => ({
        ...msg,
        _id: msg._id?.toString(),
        senderId: msg.senderId?.toString(),
        recipientId: msg.recipientId?.toString(),
        rideId: msg.rideId?.toString()
      }));
      
      res.status(200).json({ 
        success: true, 
        messages: formattedMessages,
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