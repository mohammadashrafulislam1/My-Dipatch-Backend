import express from "express";
import { getChatHistoryByRide, uploadChatFile } from "../Controllers/ChatController.js";
import { upload } from "../Middleware/upload.js";

export const chatRouter = express.Router();
chatRouter.get("/:rideId", getChatHistoryByRide);
chatRouter.post("/upload", upload.single("file"), uploadChatFile);