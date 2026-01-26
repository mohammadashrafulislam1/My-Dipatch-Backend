// socketServer.js - Add these updates
import { Server as SocketServer } from "socket.io";
import { ChatMessage } from "../Model/ChatMessage.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";
import { startPendingRideNotifier } from "./startPendingRideNotifier.js";
import { Notification } from "../Model/Notification.js";
import { initNotificationSocket } from "./notification.socket.js";

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

// ========== ADD THIS FUNCTION ==========
/**
 * Notify all online drivers about new ride request
 * @param {object} ride - Ride object
 */
// export const notifyDriversOfNewRide = async (ride) => {
//   try {
//     if (!io) return;
    
//     // Get all online drivers
//     const drivers = Object.keys(onlineUsers).filter(
//       userId => onlineUsers[userId].role === 'driver'
//     );
    
//     console.log(`Notifying ${drivers.length} drivers about new ride ${ride._id}`);
    
//     drivers.forEach(async (driverId) => {
//       try {
//         // Emit socket event
//         io.to(driverId).emit('new-ride-request', ride);
        
//         // Save notification for driver
//         await saveNotification(
//           driverId,
//           'driver',
//           '🚗 New Ride Request',
//           `New ride request from ${ride.pickup?.address || 'unknown location'} - Fare: $${ride.fare || 0}`,
//           'ride_request',
//           ride._id,
//           { 
//             pickup: ride.pickup, 
//             fare: ride.fare,
//             distance: ride.distance
//           }
//         );
//       } catch (err) {
//         console.error(`Error notifying driver ${driverId}:`, err);
//       }
//     });
//   } catch (error) {
//     console.error('Error in notifyDriversOfNewRide:', error);
//   }
// };

export const initSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "https://my-dipatch.vercel.app", "https://my-dipatch-driver.vercel.app"],
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
  });
  startPendingRideNotifier(io);

  // 🔥 INIT notification socket
  initNotificationSocket(io);
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

        io.to(recipientId).emit("chat-message", newMsg);

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

    // Emit to admin + sender
    io.to(recipientId).emit("support-message", newMsg);
    io.to(senderId).emit("support-message", newMsg);

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
            
            
            delete driverLocations[userId];
            delete activeRides[userId];
            io.emit("driver-location-disconnected", { driverId: userId });
          }
          
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
