import { RideModel } from "../../Model/CustomerModel/Ride.js";
import { WalletModel } from "../../Model/CustomerModel/Wallet.js";
import { WalletTransaction } from "../../Model/CustomerModel/WalletTransaction.js";
import { createTransaction } from "../AdminController/WalletController.js";


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

    // Validation (basic)
    if (!customerId || !pickup || !dropoff) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newRide = new RideModel({
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions,
      price,
    });

    await newRide.save();

    // Emit to Socket.IO (if available)
    if (req.io) {
      req.io.emit("new-ride-request", newRide); // Notify all drivers
    }

    res.status(201).json({
      message: "Ride request created successfully.",
      ride: newRide
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
  