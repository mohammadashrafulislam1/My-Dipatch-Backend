import mongoose from "mongoose";
import { RideModel } from "../../Model/CustomerModel/Ride";

export const getDriverEarnings = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: "Invalid driverId" });
    }

    // Fetch all completed rides for this driver
    const completedRides = await RideModel.find({
      driverId,
      status: "completed"
    });

    if (!completedRides.length) {
      return res.status(200).json({
        totalEarnings: 0,
        ridesCompleted: 0,
        hoursOnline: 0,
        rides: []
      });
    }

    // Summary
    const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.price || 0), 0);
    const ridesCompleted = completedRides.length;

    // Estimate online hours from ride timestamps (difference between ride createdAt and updatedAt)
    const hoursOnline = completedRides.reduce((sum, ride) => {
      const start = new Date(ride.createdAt);
      const end = new Date(ride.updatedAt || Date.now());
      const diffHours = (end - start) / (1000 * 60 * 60);
      return sum + diffHours;
    }, 0).toFixed(2);

    // Detailed Ride History
    const rides = completedRides.map(ride => ({
      date: ride.createdAt,
      from: ride.pickup.address,
      to: ride.dropoff.address,
      fare: ride.price || 0,
      distance: null // optional: add if you have GPS or haversine formula later
    }));

    res.status(200).json({
      totalEarnings,
      ridesCompleted,
      hoursOnline,
      rides
    });

  } catch (err) {
    console.error("Driver earnings error:", err);
    res.status(500).json({ message: "Server error fetching driver earnings" });
  }
};
