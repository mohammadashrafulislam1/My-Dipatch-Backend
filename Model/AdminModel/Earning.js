import mongoose from "mongoose";

const earningSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for driver name
earningSchema.virtual("driverName", {
  ref: "User",
  localField: "driverId",
  foreignField: "_id",
  justOne: true,
  transform: (doc) => doc ? `${doc.firstName} ${doc.lastName}` : null
});

// Enable virtuals in output
earningSchema.set("toJSON", { virtuals: true });
earningSchema.set("toObject", { virtuals: true });

export const EarningModel = mongoose.model("Earning", earningSchema);