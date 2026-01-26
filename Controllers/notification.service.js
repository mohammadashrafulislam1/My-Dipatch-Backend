
import { emitNotificationToUser, emitNotificationToUsers } from "../Middleware/notification.socket.js";
import { Notification } from "../Model/Notification.js";
export const createNotification = async ({
  userIds = [],          // array (supports multi-user)
  userRole,
  title,
  message,
  type = "system",
  rideId = null,
  metadata = {}
}) => {
  try {
    if (!userIds.length) return;

    const notifications = [];

    for (const userId of userIds) {
      const notification = await Notification.create({
        userId,
        userRole,
        title,
        message,
        type,
        rideId,
        metadata,
        read: false
      });

      notifications.push(notification);

      // 🔥 emit realtime
      emitNotificationToUser(userId, "new-notification", notification);
    }

    return notifications;
  } catch (err) {
    console.error("Notification service error:", err);
  }
};
