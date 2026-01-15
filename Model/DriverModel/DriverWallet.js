import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["ride", "withdrawal"],
    required: true,
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    default: null,
  },
  amount: {
    type: Number,
    required: true,
  },
  method: {
    type: String,
    enum: ["cash", "card", "bank"],
    default: "cash"
  },
  status: {
    type: String,
    enum: ["pending", "approved", "paid", "rejected"],
    default: "paid" // rides = paid automatically
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const driverWalletSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  transactions: [transactionSchema],
  totalEarnings: {
    type: Number,
    default: 0,
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
  }
});

export const DriverWallet = mongoose.model("DriverWallet", driverWalletSchema);
