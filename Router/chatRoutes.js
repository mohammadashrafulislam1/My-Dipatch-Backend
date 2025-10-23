import express from "express";
import { deleteRideChat, getChatHistoryByRide, sendAdminMessage, sendChatMessage, uploadChatFile } from "../Controllers/ChatController.js";
import { upload } from "../Middleware/upload.js";
import { verifyToken } from "../Middleware/jwt.js";

export const chatRouter = express.Router();
chatRouter.get("/customer/:rideId", verifyToken('customer'), getChatHistoryByRide);
chatRouter.get("/driver/:rideId", verifyToken('driver'), getChatHistoryByRide);
chatRouter.post("/driver/upload", upload.single("file"), uploadChatFile);

// Send admin message (to all, customers, drivers, or a specific user)
chatRouter.post("/admin/send", sendAdminMessage);

// Send text message
chatRouter.post("/send", sendChatMessage);

// Delete all chat messages for a completed ride (admin or system only — add auth as needed)
chatRouter.delete("/ride/:rideId", deleteRideChat);