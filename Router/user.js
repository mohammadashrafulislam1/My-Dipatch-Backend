import { CreateSignupController } from "../Controllers/SignupController.js";
import { upload } from "../Middleware/upload.js";
import express from "express";

export const userRouter = express.Router();

userRouter.post('/', upload.single('profileImage'), CreateSignupController);