import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { config as configDotenv } from "dotenv";
import http from "http";
import { userRouter } from "./Router/user.js";
import { rideRouter } from "./Router/CustomerRouter/rideRoutes.js";
import { initSocket, getIO } from "./Middleware/socketServer.js";
import { driverRouter } from "./Router/RiderRouter/driverRouter.js";
import { chatRouter } from "./Router/chatRoutes.js";
import { walletRouter } from "./Router/CustomerRouter/walletRoutes.js";

configDotenv();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);

// Initialize socket.io with the HTTP server
const io = initSocket(server);

// Middleware to provide io in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/user', userRouter);
app.use("/api/rides", rideRouter);
app.use("/api/driver", driverRouter);
app.use("/api/chat", chatRouter);
app.use("/api/wallet", walletRouter);

// DB Connection
if (!process.env.MongoDB_User || !process.env.MongoDB_Pass) {
  console.error("MongoDB credentials not set.");
  process.exit(1);
}

const mongoURI = `mongodb+srv://${process.env.MongoDB_User}:${process.env.MongoDB_Pass}@cluster0.dcw0sky.mongodb.net/LocalRun?retryWrites=true&w=majority&appName=Cluster0`;

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Test Route
app.get("/", (req, res) => res.send("Hello, World!"));

// Start the server using HTTP server (not app.listen)
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
