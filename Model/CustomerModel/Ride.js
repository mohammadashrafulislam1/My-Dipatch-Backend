import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
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

export const RideModel = mongoose.model("Ride", rideSchema);
