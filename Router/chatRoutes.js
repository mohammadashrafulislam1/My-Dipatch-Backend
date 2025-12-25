import express from "express";
import mongoose from "mongoose";

import { deleteRideChat, getChatHistory, getChatHistoryByRide, getSupportChatHistory, getUnreadChatCount, markMessagesAsRead, sendAdminMessage, sendAdminSupportReply, sendChatMessage, sendSupportMessage, uploadChatFile } from "../Controllers/ChatController.js";
import { upload } from "../Middleware/upload.js";
import { verifyToken } from "../Middleware/jwt.js";
import { ChatMessage } from "../Model/ChatMessage.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";

export const chatRouter = express.Router();
chatRouter.get("/customer/:rideId", verifyToken('customer'), getChatHistoryByRide);
chatRouter.get("/driver/:rideId", verifyToken('driver'), getChatHistoryByRide);
// Admin chat history
chatRouter.get(
  "/admin/:rideId",
  verifyToken("admin"),
  getChatHistoryByRide
);

chatRouter.get(
  "/support",
  verifyToken(),
  getChatHistory
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
      const adminId = req.user?.id;

      console.log("\n===== ADMIN USER CHAT HISTORY =====");
      console.log("Admin ID:", adminId);
      console.log("User ID:", userId);

      /* --------------------------------------------------
         1. Validate ObjectIds (PREVENTS 500 ERRORS)
      -------------------------------------------------- */
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const adminObjectId = new mongoose.Types.ObjectId(adminId);

      /* --------------------------------------------------
         2. Find ALL rides for this user
      -------------------------------------------------- */
      const rides = await RideModel.find({
        $or: [
          { customerId: userObjectId },
          { driverId: userObjectId },
        ],
      }).select("_id customerId driverId status");

      const rideIds = rides.map((r) => r._id);

      console.log("Rides found:", rideIds.length);

      if (rideIds.length === 0) {
        return res.status(200).json({
          success: true,
          messages: [],
          count: 0,
        });
      }

      /* --------------------------------------------------
         3. Fetch ALL messages for those rides
      -------------------------------------------------- */
      const messages = await ChatMessage.find({
        rideId: { $in: rideIds },
      })
        .sort({ createdAt: 1 })
        .lean();

      console.log("Messages found:", messages.length);

      /* --------------------------------------------------
         4. Filter only RELEVANT messages
      -------------------------------------------------- */
      const relevantMessages = messages.filter((msg) => {
        const senderId = msg.senderId?.toString();
        const recipientId = msg.recipientId?.toString();

        const adminInvolved =
          senderId === adminId.toString() ||
          recipientId === adminId.toString();

        const userInvolved =
          senderId === userId.toString() ||
          recipientId === userId.toString();

        return adminInvolved || userInvolved;
      });

      console.log("Relevant messages:", relevantMessages.length);

      /* --------------------------------------------------
         5. Normalize ObjectIds for frontend
      -------------------------------------------------- */
      const formattedMessages = relevantMessages.map((msg) => ({
        ...msg,
        _id: msg._id.toString(),
        rideId: msg.rideId?.toString(),
        senderId: msg.senderId?.toString(),
        recipientId: msg.recipientId?.toString(),
      }));

      /* --------------------------------------------------
         6. Send response
      -------------------------------------------------- */
      return res.status(200).json({
        success: true,
        messages: formattedMessages,
        count: formattedMessages.length,
      });

    } catch (error) {
      console.error("ADMIN CHAT ERROR ❌", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve admin chat history",
        error: error.message,
      });
    }
  }
);

// support chat:
chatRouter.post("/support/send", verifyToken(), sendSupportMessage);
chatRouter.post("/admin-reply", verifyToken(), sendAdminSupportReply);
chatRouter.get("/history", verifyToken(), getSupportChatHistory);