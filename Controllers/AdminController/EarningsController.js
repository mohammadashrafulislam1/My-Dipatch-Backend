import { EarningModel } from "../../Model/AdminModel/Earning";
import { UserModel } from "../../Model/User";


// Get earnings with filters
export const getEarnings = async (req, res) => {
  try {
    const { driverName, status, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Driver filter
    if (driverName) {
      const drivers = await UserModel.find({
        role: "driver",
        $or: [
          { firstName: { $regex: driverName, $options: "i" } },
          { lastName: { $regex: driverName, $options: "i" } }
        ]
      });
      
      if (drivers.length > 0) {
        filter.driverId = { $in: drivers.map(d => d._id) };
      } else {
        // Return empty if no matching drivers
        return res.json([]);
      }
    }
    
    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }
    
    // Date range filter
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const earnings = await EarningModel.find(filter)
      .populate("driverId", "firstName lastName")
      .populate("rideId", "pickup dropoff")
      .sort({ date: -1 });
    
    res.json(earnings);
  } catch (err) {
    console.error("Error fetching earnings:", err);
    res.status(500).json({ message: "Server error fetching earnings" });
  }
};

// Toggle earning status
export const toggleEarningStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const earning = await EarningModel.findById(id);
    if (!earning) {
      return res.status(404).json({ message: "Earning record not found" });
    }
    
    // Toggle status
    earning.status = earning.status === "pending" ? "paid" : "pending";
    
    await earning.save();
    
    res.json({
      message: "Earning status updated",
      earning
    });
  } catch (err) {
    console.error("Error toggling earning status:", err);
    res.status(500).json({ message: "Server error updating status" });
  }
};

// Get all drivers for filter dropdown
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await UserModel.find(
      { role: "driver" },
      "firstName lastName _id"
    );
    res.json(drivers);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({ message: "Server error fetching drivers" });
  }
};