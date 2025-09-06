import axios from "axios";
import { onlineUsers } from "../../Middleware/socketServer.js";
import { RideModel } from "../../Model/CustomerModel/Ride.js";
import { WalletModel } from "../../Model/CustomerModel/Wallet.js";
import { WalletTransaction } from "../../Model/CustomerModel/WalletTransaction.js";
import { UserModel } from "../../Model/User.js";
import { createTransaction } from "../AdminController/WalletController.js";


// Create a new ride request
// Create a new ride request
export const requestRide = async (req, res) => {
  try {
    const {
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions,
      price,
    } = req.body;

    console.log("📦 Ride request body:", req.body);

    // Validation (basic)
    if (!customerId || !pickup || !dropoff) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Prepare waypoints (midway stops)
    const waypoints =
      midwayStops?.map((stop) => `${stop.lat},${stop.lng}`).join("|") || "";

    // Google Directions API call
    const googleRes = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${pickup.lat},${pickup.lng}`,
          destination: `${dropoff.lat},${dropoff.lng}`,
          waypoints,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    // Validate Google API response
    if (
      !googleRes.data ||
      googleRes.data.status !== "OK" ||
      !googleRes.data.routes.length
    ) {
      console.error("❌ Google Directions API error:", googleRes.data);
      return res.status(400).json({
        message: "Unable to get route from Google Maps API",
        details: googleRes.data?.status || "NO_RESPONSE",
      });
    }

    // Extract route details
    const route = googleRes.data.routes[0];
    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach((leg) => {
      totalDistance += leg.distance.value; // in meters
      totalDuration += leg.duration.value; // in seconds
    });

    const distanceMi = (totalDistance / 1609.34).toFixed(1); // miles
    const etaMin = Math.round(totalDuration / 60); // minutes

    // Create and save ride
    const newRide = new RideModel({
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions,
      price,
      status: "pending",
      eta: `${etaMin} min`,
      distance: `${distanceMi} mi`,
    });

    await newRide.save();

    // Notify only active drivers who are online
    if (req.io) {
      console.log("🔔 Emitting new-ride-request to active connected drivers...");

      // Query only active drivers from DB
      const activeDrivers = await UserModel.find({
        role: "driver",
        status: "active",
      });

      activeDrivers.forEach((driver) => {
        const userId = driver._id.toString();
        if (onlineUsers[userId]) {
          req.io.to(userId).emit("new-ride-request", newRide);
          console.log(`📢 Emitted new-ride-request to driver ${userId}`);
        } else {
          console.log(`⚠️ Driver ${userId} not connected, skipping emit`);
        }
      });
    } else {
      console.log("❌ Socket.io instance not found on req.io");
    }

    // Send success response
    res.status(201).json({
      message: "Ride request created successfully.",
      ride: newRide,
    });
  } catch (err) {
    console.error("Ride request error:", err);
    res.status(500).json({ message: "Server error creating ride request." });
  }
};



// Update ride status (for admin or driver)
export const updateRideStatus = async (req, res) => {
    const { rideId } = req.params;
    const { status } = req.body;
  
    const allowedStatuses = ["pending", "accepted", "on_the_way", "in_progress", "completed", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }
  
    try {
      const updated = await RideModel.findByIdAndUpdate(
        rideId,
        { status, updatedAt: new Date() },
        { new: true }
      );
  
      if (!updated) return res.status(404).json({ message: "Ride not found" });
      // Inside updateRideStatus, after updating status:
if (status === "completed") {
  const ride = await RideModel.findById(rideId);
  const wallet = await WalletModel.findOne({ userId: ride.customerId });
  if (wallet && ride.price && wallet.balance >= ride.price) {
    wallet.balance -= ride.price;
    await wallet.save();
    await WalletTransaction.create({
      userId: ride.customerId,
      amount: ride.price,
      type: "ride_fare",
      metadata: { rideId }
    });
  }
   // Create wallet transaction
   await createTransaction(ride);
}
  
      if (req.io) {
        req.io.to(updated.customerId.toString()).emit("ride-status-update", updated);
      }
  
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update ride status" });
    }
  };
  
// Get ride history for a specific customer
export const getRideHistory = async (req, res) => {
    try {
      const { customerId } = req.params;
  
      if (!customerId) {
        return res.status(400).json({ message: "Missing customerId parameter." });
      }
  
      // Find all rides for the customer, optionally sorted by date (latest first)
      const rides = await RideModel.find({ customerId })
        .sort({ createdAt: -1 }); // newest first
  
      if (!rides || rides.length === 0) {
        return res.status(404).json({ message: "No rides found for this customer." });
      }
  
      res.status(200).json({
        message: "Ride history retrieved successfully.",
        rides,
      });
    } catch (err) {
      console.error("Get ride history error:", err);
      res.status(500).json({ message: "Server error retrieving ride history." });
    }
  };
 // Get a ride by ID
export const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({ message: "Missing rideId parameter." });
    }

    const ride = await RideModel.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    res.status(200).json({
      message: "Ride retrieved successfully.",
      ride,
    });
  } catch (err) {
    console.error("Get ride by ID error:", err);
    res.status(500).json({ message: "Server error retrieving ride." });
  }
};



// Get ride history for a specific Driver
export const getDriverRideHistory = async (req, res) => {
    try {
      const { driverId } = req.params;
  
      if (!driverId) {
        return res.status(400).json({ message: "Missing driverId parameter." });
      }
  
      const rides = await RideModel.find({ driverId })
        .sort({ createdAt: -1 });
  
      if (!rides || rides.length === 0) {
        return res.status(404).json({ message: "No rides found for this driver." });
      }
  
      res.status(200).json({
        message: "Driver ride history retrieved successfully.",
        rides,
      });
    } catch (err) {
      console.error("Get driver ride history error:", err);
      res.status(500).json({ message: "Server error retrieving driver ride history." });
    }
  };
  