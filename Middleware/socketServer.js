import { Server as SocketServer } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new SocketServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const onlineUsers = {};

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", ({ userId, role }) => {
      onlineUsers[userId] = { socketId: socket.id, role };
      socket.join(userId);
      console.log(`${role} ${userId} joined`);
    });

    socket.on("accept-ride", ({ rideId, driverId, customerId }) => {
      io.to(customerId).emit("ride-accepted", { rideId, driverId });
    });

    socket.on("driver-location", ({ rideId, coords, customerId }) => {
      io.to(customerId).emit("driver-location", { rideId, coords });
    });

    socket.on("disconnect", () => {
      for (let userId in onlineUsers) {
        if (onlineUsers[userId].socketId === socket.id) {
          delete onlineUsers[userId];
          break;
        }
      }
      console.log("Socket disconnected:", socket.id);
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
