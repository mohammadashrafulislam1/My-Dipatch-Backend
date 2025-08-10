import { Server as SocketServer } from "socket.io";
import { ChatMessage } from "../Model/ChatMessage.js";
import { RideModel } from "../Model/CustomerModel/Ride.js";
import { startPendingRideNotifier } from "./startPendingRideNotifier.js";

let io;

  // Store all connected users
  export const onlineUsers = {};
  console.log(onlineUsers)

export const initSocket = (server) => {
  io = new SocketServer(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "https://my-dipatch.vercel.app"],
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
  });
  startPendingRideNotifier(io);
    // 🔐 JWT Middleware for Socket.IO
    /*io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
  
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }
  
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        socket.user = decoded; 
        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
    });*/
  

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
 console.log("rideData:", rideData)
      io.to("admin").emit("new-ride-request", rideData);
      io.to("driver").emit("new-ride-request", rideData);  // notify all drivers)
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
  // io.on("connection", (socket) => {
  //   console.log("Socket connected:", socket.id);
  
  //   // Emit a test notification to your driver ID after 3 seconds
  //   setTimeout(() => {
  //     io.to("6897f362d0b0f0a2da455188").emit("new-ride-request", {
  //       pickup: { address: "123 Test St" },
  //       dropoff: { address: "456 Demo Ave" },
  //       price: 15,
  //       requestId: "test123"
  //     });
  //     console.log("Sent test ride request to driver");
  //   }, 3000);
  
  //   // other handlers...
  // });
  
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
