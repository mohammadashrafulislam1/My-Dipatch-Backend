import { RideModel } from "../../Model/CustomerModel/Ride";


// Get available ride requests (for driver to view and accept)
export const getAvailableRides = async (req, res) => {
  try {
    const rides = await RideModel.find({ status: "pending" }).sort({ createdAt: -1 });
    res.status(200).json({ message: "Available rides fetched.", rides });
  } catch (err) {
    console.error("Error fetching available rides:", err);
    res.status(500).json({ message: "Failed to fetch rides." });
  }
};

// Driver accepts a ride
export const acceptRide = async (req, res) => {
  const { rideId } = req.params;
  const { driverId } = req.body;

  if (!rideId || !driverId) {
    return res.status(400).json({ message: "Missing rideId or driverId." });
  }

  try {
    const ride = await RideModel.findOneAndUpdate(
      { _id: rideId, status: "pending" },
      {
        status: "accepted",
        driverId,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!ride) return res.status(404).json({ message: "Ride not found or already accepted." });

    if (req.io) {
      req.io.to(ride.customerId.toString()).emit("ride-accepted", {
        rideId: ride._id,
        driverId,
      });
    }

    res.status(200).json({ message: "Ride accepted successfully.", ride });
  } catch (err) {
    console.error("Error accepting ride:", err);
    res.status(500).json({ message: "Server error accepting ride." });
  }
};

// Get ride history for a specific driver
export const getDriverRideHistory = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({ message: "Missing driverId parameter." });
    }

    const rides = await RideModel.find({ driverId }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(404).json({ message: "No rides found for this driver." });
    }

    res.status(200).json({
      message: "Ride history for driver retrieved successfully.",
      rides,
    });
  } catch (err) {
    console.error("Driver ride history error:", err);
    res.status(500).json({ message: "Error retrieving ride history." });
  }
};
