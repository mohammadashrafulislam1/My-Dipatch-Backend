// models/AdminNotification.js
import mongoose from "mongoose";

const AdminNotificationSchema = new mongoose.Schema({
  type: String, // e.g., withdrawal_request
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
  amount: Number,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
  },
  status: { type: String, default: "pending" }, // pending, processed
  createdAt: Date,
});

export const AdminNotificationModel = mongoose.model("AdminNotification", AdminNotificationSchema);
