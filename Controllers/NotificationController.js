// controllers/notificationController.js
import { emitNotificationToUser } from "../Middleware/notification.socket.js";
import { Notification } from "../Model/Notification.js";
import { generateEmailTemplate } from "../utils/emailTemplates.js";

export const createNotification = async ({
  userIds = [],          // array (supports multi-user)
  userRole,
  title,        // send email title
  subtitle,     // send email subtitle
  message,      // main content/body
  type = "system",
  rideId = null,
  metadata = {}
}) => {
  try {
    console.log("🚀 createNotification called with:", {
      userIds,
      userRole,
      title,
      message,
      type,
      rideId,
      metadata,
    });

    if (!userIds.length) {
      console.log("⚠️ No userIds provided, skipping notifications");
      return;
    }

    const notifications = [];

    for (const userId of userIds) {
      console.log(`Creating notification for userId: ${userId}`);
     const user = await UserModel.findById(userId); // get email
      if (!user) continue;
      
      try {
        const notification = await Notification.create({
          userId,
          userRole,
          title,
          message,
          type,
          rideId,
          metadata,
          read: false,
        });

        console.log("✅ Notification saved:", notification);

        notifications.push(notification);

        // 🔥 emit realtime
        console.log(`Emitting notification to user ${userId}`);
        emitNotificationToUser(userId, "new-notification", notification);
 // Send email
        if (user.email) {
          const emailHtml = generateEmailTemplate({
            title,                       // email title
            subtitle: subtitle || `Hi ${user.name || "there"}, you have a new notification!`,
            bodyContent: `<p>${message}</p>`,
          });

          await sendEmail({
            to: user.email,
            subject: title,              // email subject same as title
            html: emailHtml,
          });
        }

      } catch (innerErr) {
        console.error(`❌ Failed to save notification for user ${userId}:`, innerErr);
      }
    }

    console.log("All notifications processed. Total saved:", notifications.length);

    return notifications;

  } catch (err) {
    console.error("Notification service error:", err);
  }
};

// Get notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const  userId  = req.user.id;
    const { limit = 20, page = 1, unreadOnly = false } = req.query;
    
    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('rideId', 'pickup destination status fare');
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    
    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const  userId  = req.user.id;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const  userId  = req.user.id;
    
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId  = req.user.id;
    
    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      userId 
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};