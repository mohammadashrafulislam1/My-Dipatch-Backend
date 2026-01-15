// models/DriverSquareAccount.js
import mongoose from "mongoose";

const driverSquareAccountSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  squareToken: { type: String, required: true },
  cardBrand: String,
  cardLast4: String,
  createdAt: { type: Date, default: Date.now }
});

export const DriverSquareAccount = mongoose.model("DriverSquareAccount", driverSquareAccountSchema);
