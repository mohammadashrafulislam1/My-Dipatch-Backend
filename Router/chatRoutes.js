import express from "express";
import { getChatHistoryByRide, uploadChatFile } from "../Controllers/ChatController";
import { upload } from "../Middleware/upload";

export const chatRouter = express.Router();
chatRouter.get("/:rideId", getChatHistoryByRide);
chatRouter.post("/upload", upload.single("file"), uploadChatFile);