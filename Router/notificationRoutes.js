// routes/notificationRoutes.js
import express from 'express';
import { deleteNotification, getUserNotifications, markAllAsRead, markAsRead } from '../Controllers/NotificationController.js';
import { verifyToken } from '../Middleware/jwt.js';

const notificationRouter = express.Router();

notificationRouter.get('/', verifyToken, getUserNotifications);
notificationRouter.put('/:notificationId/read', verifyToken, markAsRead);
notificationRouter.put('/read-all', verifyToken, markAllAsRead);
notificationRouter.delete('/:notificationId', verifyToken, deleteNotification);

export default notificationRouter;