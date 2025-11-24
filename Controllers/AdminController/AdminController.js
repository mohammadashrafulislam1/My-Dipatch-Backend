import { RideModel } from "../../Model/CustomerModel/Ride.js";
import { UserModel } from "../../Model/User.js";


// Get pending rides for admin
export const getPendingRides = async (req, res) => {
  try {
    const pendingRides = await RideModel.find({ status: "pending" })
      .populate("customerId", "firstName lastName")
      .lean();
    
    res.status(200).json(pendingRides);
  } catch (err) {
    console.error("Error fetching pending rides:", err);
    res.status(500).json({ message: "Server error fetching pending rides" });
  }
};

// Assign driver to a ride
export const assignDriverToRide = async (req, res) => {
  const { rideId } = req.params;
  const { driverId } = req.body;

  try {
    // Validate inputs
    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    // Check if driver exists
    const driver = await UserModel.findOne({ 
      _id: driverId, 
      role: "driver" ,
      status: "active" // ✅ Ensure driver is active
    });
    
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Update ride with driver assignment
    const updatedRide = await RideModel.findByIdAndUpdate(
      rideId,
      { 
        driverId,
        status: "accepted",
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate("customerId", "firstName lastName")
    .populate("driverId", "firstName lastName");

    if (!updatedRide) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Socket notification (if available)
    if (req.io) {
      req.io.to(updatedRide.customerId.toString()).emit("ride-assigned", {
        rideId: updatedRide._id,
        driver: {
          id: driver._id,
          name: `${driver.firstName} ${driver.lastName}`
        }
      });
    }

    res.json({
      message: "Driver assigned successfully",
      ride: updatedRide
    });
  } catch (err) {
    console.error("Error assigning driver:", err);
    res.status(500).json({ message: "Server error assigning driver" });
  }
};

// Get all drivers for assignment dropdown
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await UserModel.find(
      { role: "driver" },
      "firstName lastName _id"
    );
    res.status(200).json(drivers);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({ message: "Server error fetching drivers" });
  }
};