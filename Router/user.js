import { CreateSignupController, deleteUser, getCurrentUser, 
    getUsers, login, updateUserStatus } from "../Controllers/SignupController.js";
import { upload } from "../Middleware/upload.js";
import express from "express";

export const userRouter = express.Router();

userRouter.post('/signup', upload.single('profileImage'), CreateSignupController);
userRouter.post('/login', login)
// Get current user route (protected)
userRouter.get('/me', getCurrentUser);
userRouter.get('/', getUsers)
userRouter.delete('/:id',  deleteUser)
// PUT /api/users/:id/status
// userRouter.put('/:id/status', isAuthenticated, isAdmin, updateUserStatus);