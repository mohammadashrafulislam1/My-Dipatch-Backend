import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  lat: {
    type: Number,
  },
  lng: {
    type: Number,
  },
  address: {
    type: String,
  }
}, { _id: false });

const rideSchema = new mongoose.Schema({
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
  pickup: {
    type: locationSchema,
    required: true
  },
  dropoff: {
    type: locationSchema,
    required: true
  },
  midwayStops: {
    type: [locationSchema],
    default: []
  },
  instructions: {
    type: String,
    default: ""
  },
  price: {
    type: Number,
    required: false, // Or true if you always calculate upfront
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "on_the_way", "in_progress", "completed", "cancelled"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

rideSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add to rideSchema in Ride.js
rideSchema.virtual("customer", {
  ref: "User",
  localField: "customerId",
  foreignField: "_id",
  justOne: true
});

rideSchema.virtual("driver", {
  ref: "User",
  localField: "driverId",
  foreignField: "_id",
  justOne: true
});

// Enable virtuals in toJSON output
rideSchema.set("toJSON", { virtuals: true });

export const RideModel = mongoose.model("Ride", rideSchema);
