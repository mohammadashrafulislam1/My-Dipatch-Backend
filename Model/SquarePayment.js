// models/SquarePayment.js
import mongoose from "mongoose";

const squarePaymentSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  
  // Square Payment Details
  squarePaymentId: {
    type: String,
    unique: true
  },
  squareOrderId: String,
  paymentStatus: {
    type: String,
    enum: ["processing", "paid", "failed", "refunded", "refund_failed"],
    default: "processing"
  },
  
  // Amounts
  totalAmount: {
    type: Number,
    required: true // In CAD
  },
  driverAmount: {
    type: Number,
    required: true // Driver's cut in CAD
  },
  adminAmount: {
    type: Number,
    required: true // Admin's cut in CAD
  },
  currency: {
    type: String,
    default: "CAD"
  },
  
  // Card Details
  cardLast4: String,
  cardBrand: String,
  receiptUrl: String,
  
  // Status Tracking
  driverPaid: {
    type: Boolean,
    default: false
  },
  adminPaid: {
    type: Boolean,
    default: true // Admin gets paid automatically via Square app fee
  },
  
  // Timestamps
  processedAt: Date,
  refundedAt: Date,
  driverPaidAt: Date,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
  
}, { timestamps: true });

export const SquarePaymentModel = mongoose.model("SquarePayment", squarePaymentSchema);