import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { config as configDotenv } from "dotenv";
import { userRouter } from "./Router/user.js";

// Routers
// Add the rest here...

configDotenv();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/user', userRouter)

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

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
