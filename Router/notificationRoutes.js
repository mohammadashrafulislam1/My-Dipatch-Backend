// routes/notificationRoutes.js
import express from 'express';
import { createNotification, deleteNotification, getUserNotifications, markAllAsRead, markAsRead } from '../Controllers/NotificationController.js';
import { verifyToken } from '../Middleware/jwt.js';

const notificationRouter = express.Router();

notificationRouter.post('/', verifyToken(), createNotification);
notificationRouter.get('/', verifyToken(), getUserNotifications);
notificationRouter.put('/:notificationId/read', verifyToken(), markAsRead);
notificationRouter.put('/read-all', verifyToken(), markAllAsRead);
notificationRouter.delete('/:notificationId', verifyToken(), deleteNotification);

export default notificationRouter;