// socketServer.js - Add these updates
import { Server as SocketServer } from "socket.io";
import { ChatMessage } from "../Model/ChatMessage.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";
import { startPendingRideNotifier } from "./startPendingRideNotifier.js";

let io;

// Store all connected users
export const onlineUsers = {};
// Store driver locations and active rides
export const driverLocations = {};
export const activeRides = {};

console.log(onlineUsers);

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

    // ... your existing chat message code ...

    // Handle join event from customer/driver/admin
    socket.on("join", async ({ userId, role }) => {
      if (!userId || !role) return;

      onlineUsers[userId] = { socketId: socket.id, role };
      socket.join(userId);
      socket.join(role);

      console.log(`${role} [${userId}] joined socket room(s)`);

      if (role === "driver") {
        // Send all pending rides to this driver on connect
        const pendingRides = await RideModel.find({ status: "pending" });
        pendingRides.forEach(ride => {
          io.to(userId).emit("new-ride-request", ride);
        });
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
          
          // Also join the ride room for location updates
          socket.join(rideId);
          socket.join(`ride-${rideId}`);
        }
      } catch (error) {
        console.error("Error accepting ride:", error);
      }
    });

    // 🔥 NEW: Driver sends live location updates
    socket.on("driver-location-update", ({ driverId, rideId, location }) => {
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
          // Find customer ID from ride data (you might need to fetch this from DB)
          RideModel.findById(rideId).then(rideData => {
            if (rideData && rideData.customerId) {
              io.to(rideData.customerId).emit("driver-location-update", {
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
    socket.on("driver-location-stop", ({ driverId }) => {
      delete driverLocations[driverId];
      delete activeRides[driverId];
      
      // Notify customers that driver stopped sharing location
      io.emit("driver-location-disconnected", { driverId });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      for (let userId in onlineUsers) {
        if (onlineUsers[userId].socketId === socket.id) {
          const role = onlineUsers[userId].role;
          console.log(`${role} [${userId}] disconnected`);
          
          // If driver disconnects, remove their location
          if (role === "driver") {
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