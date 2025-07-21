// WalletTransaction.js
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["add", "withdraw", "ride_fare"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },
  metadata: {
    type: Object, // Optional: rideId, transactionRef, etc.
    default: {}
  }
}, { timestamps: true });

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
