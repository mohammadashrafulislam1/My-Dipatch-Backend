// socketServer.js - Add these updates
import { Server as SocketServer } from "socket.io";
import { ChatMessage } from "../Model/ChatMessage.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";
import { startPendingRideNotifier } from "./startPendingRideNotifier.js";
import { Notification } from "../Model/Notification.js";
import { sendEmail } from "../utils/sendEmail.js";
import { chatEmailTemplate } from "../utils/emailTemplates.js";

let io;

// Store all connected users
export const onlineUsers = {};
// Store driver locations and active rides
export const driverLocations = {};
export const activeRides = {};

console.log(onlineUsers);

// ========== ADD THIS HELPER FUNCTION ==========
/**
 * Helper function to save notifications to database
 * @param {string} userId - User ID to receive notification
 * @param {string} userRole - Role of the user (driver/customer/admin)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {string} rideId - Related ride ID (optional)
 * @param {object} metadata - Additional data (optional)
 */
const saveNotification = async (userId, userRole, title, message, type = 'system', rideId = null, metadata = {}) => {
  try {
    if (!userId || !userRole) return;
    
    const notification = new Notification({
      userId,
      userRole,
      title,
      message,
      type,
      rideId,
      metadata,
      read: false
    });
    
    await notification.save();
    
    // Emit to the specific user if they're online
    const userSocket = onlineUsers[userId];
    if (userSocket && io) {
      io.to(userSocket.socketId).emit('new-notification', notification);
      console.log(`Notification sent to ${userRole} [${userId}]: ${title}`);
    }
    
    return notification;
  } catch (error) {
    console.error('Error saving notification:', error);
  }
};

// ========== ADD THIS FUNCTION ==========
/**
 * Notify all online drivers about new ride request
 * @param {object} ride - Ride object
 */
export const notifyDriversOfNewRide = async (ride) => {
  try {
    if (!io) return;
    
    // Get all online drivers
    const drivers = Object.keys(onlineUsers).filter(
      userId => onlineUsers[userId].role === 'driver'
    );
    
    console.log(`Notifying ${drivers.length} drivers about new ride ${ride._id}`);
    
    drivers.forEach(async (driverId) => {
      try {
        // Emit socket event
        io.to(driverId).emit('new-ride-request', ride);
        
        // Save notification for driver
        await saveNotification(
          driverId,
          'driver',
          '🚗 New Ride Request',
          `New ride request from ${ride.pickup?.address || 'unknown location'} - Fare: $${ride.fare || 0}`,
          'ride_request',
          ride._id,
          { 
            pickup: ride.pickup, 
            fare: ride.fare,
            distance: ride.distance
          }
        );
      } catch (err) {
        console.error(`Error notifying driver ${driverId}:`, err);
      }
    });
  } catch (error) {
    console.error('Error in notifyDriversOfNewRide:', error);
  }
};

export const initSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "https://my-dipatch.vercel.app", "https://my-dipatch-driver.vercel.app"],
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
  });
  startPendingRideNotifier(io);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

   // SAVE CHAT MESSAGE + EMIT TO RECIPIENT
    socket.on("chat-message", async ({ rideId, senderId, senderRole, recipientId, message, fileUrl, fileType }) => {
      try {
        const newMsg = new ChatMessage({
          rideId,
          senderId,
          senderRole,
          recipientId,
          message: message || "",
          fileUrl: fileUrl || null,
          fileType: fileType || null,
        });
    
        await newMsg.save();
        // 📧 EMAIL IF RECIPIENT IS OFFLINE
if (!onlineUsers[recipientId]) {
  await sendEmail({
    to: "technicalashraf4@gmail.com", // replace with real admin email
    subject: "New Chat Message",
    html: chatEmailTemplate({
      senderRole,
      message: message || "Sent a file",
    }),
  });
}


        io.to(recipientId).emit("chat-message", newMsg);
// 🔔 Notify recipient (NOT sender)
    await saveNotification(
      recipientId,
      senderRole === "admin" ? "customer" : "admin",
      "💬 New Message",
      message?.slice(0, 60) || "Sent you a file",
      "chat",
      rideId,
      { senderId, senderRole }
    );
        if (senderRole === "admin") {
          console.log("Admin sent:", message || fileUrl);
        }
      } catch (err) {
        console.error("Socket chat-message error:", err);
      }
    });
socket.on("support-message", async ({ senderId, senderRole, recipientId, message, fileUrl }) => {
  try {
    if (!senderId || !recipientId || !message) return;

    const newMsg = new ChatMessage({
      rideId: null,               // 🔑 SUPPORT CHAT
      senderId,
      senderRole,
      recipientId,
      message,
      fileUrl: fileUrl || null,
    });

    await newMsg.save();
// 📧 Email admin if offline
if (!onlineUsers[recipientId]) {
  await sendEmail({
    to: "technicalashraf4@gmail.com",
    subject: "New Support Message",
    html: chatEmailTemplate({
      senderRole,
      message,
    }),
  });
}

    // Emit to admin + sender
    io.to(recipientId).emit("support-message", newMsg);
    io.to(senderId).emit("support-message", newMsg);

    // 🔔 Optional notification
    await saveNotification(
      recipientId,
      "admin",
      "💬 New Support Message",
      message.slice(0, 50),
      "support_chat",
      null,
      { senderId }
    );
  } catch (err) {
    console.error("Support socket error:", err);
  }
});

    // Handle join event from customer/driver/admin
    socket.on("join", async ({ userId, role }) => {
      if (!userId || !role) return;

      onlineUsers[userId] = { socketId: socket.id, role };
      socket.join(userId);
      socket.join(role);

      console.log(`${role} [${userId}] joined socket room(s)`);

      // ========== ADD NOTIFICATIONS FOR ALL ROLES ==========
      
      // For DRIVERS: Send all pending rides on connect
      if (role === "driver") {
        const pendingRides = await RideModel.find({ status: "pending" });
        pendingRides.forEach(async (ride) => {
          io.to(userId).emit("new-ride-request", ride);
          
          // Save notification for this specific driver
          await saveNotification(
            userId,
            'driver',
            '🚗 New Ride Request',
            `New ride request from ${ride.pickup?.address || 'unknown location'}`,
            'ride_request',
            ride._id,
            { pickup: ride.pickup, fare: ride.fare }
          );
        });
      }
      
      // For ADMINS: Notify about new driver online
      if (role === "admin") {
        // You can add admin-specific notifications here
        console.log(`Admin ${userId} is now online`);
      }
      
      // For CUSTOMERS: Check for any active rides with updates
      if (role === "customer") {
        // Check if customer has any active rides
        const activeCustomerRides = await RideModel.find({ 
          customerId: userId, 
          status: { $in: ['accepted', 'ongoing'] } 
        });
        
        if (activeCustomerRides.length > 0) {
          // Send notification about active rides
          await saveNotification(
            userId,
            'customer',
            '📱 Active Rides',
            `You have ${activeCustomerRides.length} active ride(s)`,
            'system',
            null,
            { activeRides: activeCustomerRides.length }
          );
        }
      }
    });

    // Driver accepts a ride -> notify customer
    socket.on("accept-ride", async ({ rideId, driverId, customerId }) => {
      try {
        // Store active ride information
        activeRides[driverId] = rideId;
        
        if (customerId) {
          io.to(customerId).emit("ride-accepted", { 
            rideId, 
            driverId,
            message: "Your ride has been accepted! Driver is on the way."
          });
          
          // ========== SAVE NOTIFICATIONS ==========
          
          // 1. Notification for CUSTOMER
          await saveNotification(
            customerId,
            'customer',
            '✅ Ride Accepted',
            'Your ride has been accepted! Driver is on the way.',
            'ride_accepted',
            rideId,
            { driverId, status: 'accepted' }
          );
          
          // 2. Notification for DRIVER (confirmation)
          await saveNotification(
            driverId,
            'driver',
            '✅ Ride Assigned',
            'You have accepted a ride request. Head to pickup location.',
            'ride_assigned',
            rideId,
            { customerId, status: 'accepted' }
          );
          
          // 3. Optional: Notification for ADMIN (if you want admins to track)
          const admins = Object.keys(onlineUsers).filter(
            userId => onlineUsers[userId].role === 'admin'
          );
          admins.forEach(async (adminId) => {
            await saveNotification(
              adminId,
              'admin',
              '📝 Ride Status Update',
              `Driver ${driverId} accepted ride ${rideId}`,
              'ride_update',
              rideId,
              { driverId, customerId, status: 'accepted' }
            );
          });
          
          // Also join the ride room for location updates
          socket.join(rideId);
          socket.join(`ride-${rideId}`);
        }
      } catch (error) {
        console.error("Error accepting ride:", error);
      }
    });

    // 🔥 NEW: Driver sends live location updates
    socket.on("driver-location-update", async ({ driverId, rideId, location }) => {
      try {
        // Store driver location
        driverLocations[driverId] = {
          ...location,
          timestamp: Date.now(),
          rideId
        };

        // Notify the specific customer for this ride
        const ride = activeRides[driverId];
        if (ride) {
          RideModel.findById(rideId).then(async (rideData) => {
            if (rideData && rideData.customerId) {
              const customerId = rideData.customerId;
              
              io.to(customerId).emit("driver-location-update", {
                driverId,
                rideId,
                location: driverLocations[driverId]
              });
              
              // ========== LOCATION UPDATE NOTIFICATION ==========
              // Only send occasional notifications, not every location update
              const lastLocationUpdate = driverLocations[driverId]?.timestamp;
              const now = Date.now();
              
              // Send notification every 5 minutes (300000 ms) or for significant distance
              if (!lastLocationUpdate || (now - lastLocationUpdate) > 300000) {
                await saveNotification(
                  customerId,
                  'customer',
                  '📍 Driver Location',
                  `Driver is at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
                  'driver_location',
                  rideId,
                  { driverId, location, timestamp: now }
                );
              }
            }
          }).catch(err => console.error("Error finding ride:", err));
        }

        // Also broadcast to all in the ride room
        io.to(`ride-${rideId}`).emit("driver-location-update", {
          driverId,
          rideId,
          location: driverLocations[driverId]
        });

        console.log(`Driver ${driverId} location updated:`, location);
      } catch (error) {
        console.error("Error updating driver location:", error);
      }
    });

    // 🔥 NEW: Customer joins ride room to receive location updates
    socket.on("join-ride", ({ rideId, customerId }) => {
      socket.join(`ride-${rideId}`);
      console.log(`Customer ${customerId} joined ride room: ride-${rideId}`);

      // Send current driver location if available
      const driverLocation = Object.values(driverLocations).find(
        loc => loc.rideId === rideId
      );
      
      if (driverLocation) {
        const driverId = Object.keys(driverLocations).find(
          id => driverLocations[id].rideId === rideId
        );
        
        socket.emit("driver-location-update", {
          driverId,
          rideId,
          location: driverLocation
        });
      }
    });

    // 🔥 NEW: Driver stops sharing location (when ride ends or goes offline)
    socket.on("driver-location-stop", async ({ driverId }) => {
      try {
        const rideId = activeRides[driverId];
        
        // Find customer for this ride
        if (rideId) {
          const rideData = await RideModel.findById(rideId);
          if (rideData && rideData.customerId) {
            // Send notification to customer
            await saveNotification(
              rideData.customerId,
              'customer',
              '⚠️ Driver Stopped Sharing',
              'Driver has stopped sharing location updates',
              'driver_offline',
              rideId,
              { driverId, status: 'location_stopped' }
            );
          }
        }
        
        delete driverLocations[driverId];
        delete activeRides[driverId];
        
        // Notify customers that driver stopped sharing location
        io.emit("driver-location-disconnected", { driverId });
      } catch (error) {
        console.error("Error stopping driver location:", error);
      }
    });

    // ========== ADD NEW SOCKET EVENT FOR NOTIFICATION ACTIONS ==========
    socket.on('notification-read', async ({ notificationId, userId }) => {
      try {
        if (!notificationId || !userId) return;
        
        await Notification.findByIdAndUpdate(notificationId, { read: true });
        console.log(`Notification ${notificationId} marked as read by user ${userId}`);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    socket.on('notification-delete', async ({ notificationId, userId }) => {
      try {
        if (!notificationId || !userId) return;
        
        await Notification.findByIdAndDelete(notificationId);
        console.log(`Notification ${notificationId} deleted by user ${userId}`);
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      for (let userId in onlineUsers) {
        if (onlineUsers[userId].socketId === socket.id) {
          const role = onlineUsers[userId].role;
          console.log(`${role} [${userId}] disconnected`);
          
          // If driver disconnects, remove their location and send notification
          if (role === "driver") {
            const rideId = activeRides[userId];
            
            // Find customer for active ride and notify them
            if (rideId) {
              try {
                const rideData = await RideModel.findById(rideId);
                if (rideData && rideData.customerId) {
                  await saveNotification(
                    rideData.customerId,
                    'customer',
                    '⚠️ Driver Disconnected',
                    'Driver has gone offline. Your ride may be affected.',
                    'driver_offline',
                    rideId,
                    { driverId: userId, status: 'driver_disconnected' }
                  );
                }
              } catch (err) {
                console.error('Error notifying customer of driver disconnect:', err);
              }
            }
            
            delete driverLocations[userId];
            delete activeRides[userId];
            io.emit("driver-location-disconnected", { driverId: userId });
          }
          
          // Optional: Notify admins about user disconnection
          const admins = Object.keys(onlineUsers).filter(
            id => onlineUsers[id].role === 'admin'
          );
          admins.forEach(async (adminId) => {
            await saveNotification(
              adminId,
              'admin',
              '👤 User Offline',
              `${role} [${userId}] has disconnected`,
              'user_status',
              null,
              { userId, role, status: 'offline' }
            );
          });
          
          delete onlineUsers[userId];
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
