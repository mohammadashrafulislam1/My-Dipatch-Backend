import { ActiveUserStatus, CreateSignupController, deleteUser, getCurrentUser, 
    getUserById, 
    getUsers, login, logout, updateUserProfile, updateUserRole, updateUserStatus } from "../Controllers/SignupController.js";
import { verifyToken } from "../Middleware/jwt.js";
import { upload } from "../Middleware/upload.js";
import express from "express";

export const userRouter = express.Router();

userRouter.post('/signup', upload.single('profileImage'), CreateSignupController);
userRouter.post('/login', login)
userRouter.post('/logout', logout)
userRouter.put("/update/driver", verifyToken("driver"), upload.single("profileImage"), updateUserProfile); 
userRouter.put("/update/customer", verifyToken("customer"), upload.single("profileImage"), updateUserProfile); 
userRouter.put( 
  "/update-role/:id",
  verifyToken('admin'),
  updateUserRole
);
userRouter.put("/billing-address", verifyToken(), updateBillingAddress);

// Get current user route (protected)
userRouter.get('/me/customer', verifyToken('customer'), getCurrentUser);
userRouter.get('/me/driver', verifyToken('driver'), getCurrentUser);
userRouter.get('/me/admin', verifyToken('admin'), getCurrentUser);

userRouter.get('/', verifyToken(), getUsers)
userRouter.get('/:id',  getUserById)
userRouter.delete('/:id',  deleteUser)
// PUT /api/users/:id/status
userRouter.put('/:id/status', updateUserStatus);
userRouter.put('/:id/active', ActiveUserStatus);