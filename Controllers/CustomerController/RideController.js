import { RideModel } from "../../Model/CustomerModel/Ride";


// Create a new ride request
export const requestRide = async (req, res) => {
  try {
    const {
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions
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
      instructions
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
