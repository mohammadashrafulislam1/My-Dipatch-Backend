import { CreateSignupController, deleteUser, getCurrentUser, 
    getUserById, 
    getUsers, login, logout, updateUserStatus } from "../Controllers/SignupController.js";
import { verifyToken } from "../Middleware/jwt.js";
import { upload } from "../Middleware/upload.js";
import express from "express";

export const userRouter = express.Router();

userRouter.post('/signup', upload.single('profileImage'), CreateSignupController);
userRouter.post('/login', login)
userRouter.post('/logout', logout)
// Get current user route (protected)
userRouter.get('/me', verifyToken, getCurrentUser);
userRouter.get('/', getUsers)
userRouter.delete('/:id',  getUserById)
userRouter.delete('/:id',  deleteUser)
// PUT /api/users/:id/status
userRouter.put('/:id/status', updateUserStatus);