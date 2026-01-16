// models/DriverSquareAccount.js
import mongoose from "mongoose";

const driverSquareAccountSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  bankName: { type: String },
  accountNumber: { type: String }, // store encrypted in production
  routingNumber: { type: String },
  currency: { type: String, default: 'CAD' },
  createdAt: { type: Date, default: Date.now }
});

export const DriverSquareAccount = mongoose.model("DriverSquareAccount", driverSquareAccountSchema);
