import { Server as SocketServer } from "socket.io";
import { ChatMessage } from "../Model/ChatMessage.js";

let io;

export const initSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: "*", // For dev, allow all. You should restrict this in production.
      methods: ["GET", "POST", "PUT"],
    },
  });

  // Store all connected users
  const onlineUsers = {};

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("chat-message", async ({ rideId, senderId, senderRole, recipientId, message, fileUrl, fileType }) => {
      try {
        const newMsg = new ChatMessage({
          rideId,
          senderId,
          senderRole,
          recipientId,
          message: message || "", // optional
          fileUrl: fileUrl || null, // optional
          fileType: fileType || null, // "image", "file", etc.
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
    
    // Handle join event from customer/driver/admin
    socket.on("join", ({ userId, role }) => {
      if (!userId || !role) return;

      onlineUsers[userId] = { socketId: socket.id, role };
      socket.join(userId); // Join room by userId (for direct messages)
      socket.join(role);   // Join room by role (for broadcasting by role)

      console.log(`${role} [${userId}] joined socket room(s)`);
    });

    // Driver accepts a ride -> notify customer
    socket.on("accept-ride", ({ rideId, driverId, customerId }) => {
      if (customerId) {
        io.to(customerId).emit("ride-accepted", { rideId, driverId });
      }
    });

    // Driver sends live location -> notify customer
    socket.on("driver-location", ({ rideId, coords, customerId }) => {
      if (customerId) {
        io.to(customerId).emit("driver-location", { rideId, coords });
      }
    });

    // Admin broadcasts to all drivers
    socket.on("admin-broadcast", ({ message }) => {
      io.to("driver").emit("admin-message", { message });
    });

    // Notify all admins of new ride requests (optional)
    socket.on("new-ride", (rideData) => {
      io.to("admin").emit("new-ride-request", rideData);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      for (let userId in onlineUsers) {
        if (onlineUsers[userId].socketId === socket.id) {
          console.log(`${onlineUsers[userId].role} [${userId}] disconnected`);
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
