import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  totalFare: {
    type: Number,
    required: true
  },
  driverEarning: {
    type: Number,
    required: true
  },
  adminCut: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual fields for names
transactionSchema.virtual("customerName", {
  ref: "User",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
  transform: (doc) => doc ? `${doc.firstName} ${doc.lastName}` : null
});

transactionSchema.virtual("driverName", {
  ref: "User",
  localField: "driverId",
  foreignField: "_id",
  justOne: true,
  transform: (doc) => doc ? `${doc.firstName} ${doc.lastName}` : null
});

// Enable virtuals in output
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

export const TransactionModel = mongoose.model("Transaction", transactionSchema);