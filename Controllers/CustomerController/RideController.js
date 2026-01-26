import axios from "axios";
import { onlineUsers } from "../../Middleware/socketServer.js";
import { RideModel } from "../../Model/CustomerModel/Ride.js";
import { WalletModel } from "../../Model/CustomerModel/Wallet.js";
import { WalletTransaction } from "../../Model/CustomerModel/WalletTransaction.js";
import { UserModel } from "../../Model/User.js";
import { createTransaction } from "../AdminController/WalletController.js";
import { PricingModel } from "../../Model/AdminModel/Pricing.js";

// Create a new ride request
export const requestRide = async (req, res) => {
  try {
    const {
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions,
    } = req.body;

    console.log("📦 Ride request body:", req.body);

    if (!customerId || !pickup || !dropoff) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const waypoints =
      midwayStops?.map((stop) => `${stop.lat},${stop.lng}`).join("|") || "";

    // Google Directions API
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

    if (
      !googleRes.data ||
      googleRes.data.status !== "OK" ||
      !googleRes.data.routes.length
    ) {
      console.error("❌ Google API error:", googleRes.data);
      return res.status(400).json({
        message: "Unable to get route from Google Maps API",
        details: googleRes.data?.status || "NO_RESPONSE",
      });
    }

    const route = googleRes.data.routes[0];
    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach((leg) => {
      totalDistance += leg.distance.value; // meters
      totalDuration += leg.duration.value; // seconds
    });

    const distanceKm = (totalDistance / 1000).toFixed(2);
    const etaMin = Math.round(totalDuration / 60);

    // 👉 Fetch pricing settings
    const settings = await PricingModel.getSettings();

    // Base fare
    const baseFare = settings.pricePerKm * parseFloat(distanceKm);

    // Admin commission
    const adminCut = (baseFare * settings.adminCommission) / 100;

    // DRIVER earning (price displayed to driver)
    const driverEarning = baseFare - adminCut;

    // CUSTOMER fare (what customer pays)
    const customerFare = baseFare + adminCut;

    // Save ride
    const newRide = new RideModel({
      customerId,
      pickup,
      dropoff,
      midwayStops,
      instructions,

      // ⭐ FINAL LOGIC ⭐
      price: driverEarning.toFixed(2),     // WHAT DRIVER EARNS
      customerFare: customerFare.toFixed(2), // WHAT CUSTOMER PAYS
      adminCut: adminCut.toFixed(2),        // ADMIN CUT AMOUNT

      status: "pending",
      eta: `${etaMin} min`,
      distance: `${distanceKm} km`,
    });

    await newRide.save();
// Schedule automatic deletion
setTimeout(async () => {
  try {
    const ride = await RideModel.findById(newRide._id);
    if (ride && !ride.isPaid) {
      await RideModel.findByIdAndDelete(newRide._id);
      console.log(`Ride ${newRide._id} auto-deleted (unpaid)`);
    }
  } catch (err) {
    console.error("Auto-delete ride error:", err);
  }
}, 10 * 60 * 1000); // 10 minutes in milliseconds
    // Socket emit to active drivers
    if (req.io) {
      const activeDrivers = await UserModel.find({
        role: "driver",
        status: "active",
      });

      activeDrivers.forEach((driver) => {
        const userId = driver._id.toString();
        if (onlineUsers[userId]) {
          req.io.to(userId).emit("new-ride-request", newRide);
        }
      });
    }

    res.status(201).json({
      message: "Ride request created successfully.",
      ride: newRide,
    });

  } catch (err) {
    console.error("Ride request error:", err);
    res.status(500).json({
      message: "Server error creating ride request.",
      error: err.message,
    });
  }
};

// ✅ Update ride status (supports driver assignment)
export const updateRideStatus = async (req, res) => {
  const { rideId } = req.params;
  const { status, driverId } = req.body;

  const allowedStatuses = [
    "pending",
    "accepted",
    "on_the_way",
    "in_progress",
    "completed",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const ride = await RideModel.findById(rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found." });
console.log("Updating timestamps:", ride.timestamps);

    // Prevent stealing
    if (ride.driverId && ride.driverId.toString() !== driverId && status === "accepted") {
      return res.status(400).json({ message: "Ride already accepted by another driver." });
    }

    // Assign driver when accepting
    if (status === "accepted" && driverId) {
      ride.driverId = driverId;
      ride.timestamps.acceptedAt = new Date();   // ⬅ NEW
    }

    // Driver arrived at pickup
    if (status === "on_the_way") {
      ride.timestamps.arrivedAt = new Date();    // ⬅ NEW
    }

    // Driver picked up rider
    if (status === "in_progress") {
      ride.timestamps.pickupAt = new Date();     // ⬅ NEW
    }

    // Driver completed ride
    if (status === "completed") {
      ride.timestamps.dropoffAt = new Date();    // ⬅ NEW
    }

    // Set status & updated time
    ride.status = status;
    ride.updatedAt = new Date();
    await ride.save();

    // ===========================
    // WALLET LOGIC (already correct)
    // ===========================
    if (status === "completed") {
      const wallet = await WalletModel.findOne({ userId: ride.customerId });

      if (wallet && ride.price && wallet.balance >= ride.price) {
        wallet.balance -= ride.price;
        await wallet.save();

        await WalletTransaction.create({
          userId: ride.customerId,
          amount: ride.price,
          type: "ride_fare",
          metadata: { rideId },
        });
      }

      await createTransaction(ride); // admin commission
    }

    // Notify customer via socket
    if (req.io) {
      req.io.to(ride.customerId.toString()).emit("ride-status-update", ride);
    }

    res.json(ride);
  } catch (err) {
    console.error("❌ updateRideStatus error:", err);
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

    const ride = await RideModel.findOne({
      _id: rideId,
      isPaid: true,          // ✅ only paid rides
    });

    if (!ride) {
      return res.status(404).json({ 
        message: "Ride not found or payment not completed yet." 
      });
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

// Get all rides
export const getAllRides = async (req, res) => {
  try {
    const rides = await RideModel.find({ isPaid: true })   // ✅ filter here
      .sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(404).json({ message: "No paid rides found." });
    }

    res.status(200).json({
      message: "Paid rides retrieved successfully.",
      rides,
    });
  } catch (err) {
    console.error("Get all rides error:", err);
    res.status(500).json({ message: "Server error retrieving rides." });
  }
};

// ⭐ NEW: Calculate fare without creating ride
export const calculateFare = async (req, res) => {
  try {
   const { pickup, dropoff, midwayStops } = req.body;

// Validate coordinates
if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
  return res.status(400).json({ message: "Invalid pickup or dropoff coordinates" });
}

// Only include valid midway stops
const validStops = midwayStops?.filter(stop => stop.lat && stop.lng) || [];

// Google expects waypoints param only if there are valid stops
const params = {
  origin: `${pickup.lat},${pickup.lng}`,
  destination: `${dropoff.lat},${dropoff.lng}`,
  key: process.env.GOOGLE_MAPS_API_KEY,
};

if (validStops.length) {
  params.waypoints = validStops.map(stop => `${stop.lat},${stop.lng}`).join("|");
}

const googleRes = await axios.get(
  "https://maps.googleapis.com/maps/api/directions/json",
  { params }
);

if (googleRes.data.status !== "OK") {
  console.error("Google Directions API status:", googleRes.data.status, googleRes.data.error_message);
  return res.status(400).json({ message: "Google map error" });
}

    const route = googleRes.data.routes[0];

    let totalDistance = 0;
    let totalDuration = 0;
    route.legs.forEach((leg) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });

    const distanceKm = (totalDistance / 1000).toFixed(2);
    const etaMin = Math.round(totalDuration / 60);

    // Pricing settings
    const settings = await PricingModel.getSettings();

    const baseFare = settings.pricePerKm * parseFloat(distanceKm);
    const adminCut = (baseFare * settings.adminCommission) / 100;

    const driverEarning = baseFare - adminCut;
    const customerFare = baseFare + adminCut;

    res.json({
      distance: distanceKm + " km",
      eta: etaMin + " min",
      customerFare: customerFare.toFixed(2),
      driverEarning: driverEarning.toFixed(2),
      adminCut: adminCut.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Price calculation failed" });
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

  // Delete a ride by ID
export const deleteRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({ message: "Missing rideId parameter." });
    }

    const ride = await RideModel.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    // Optional: Refund logic if payment was completed
    if (ride.isPaid) {
      console.log(`Ride ${rideId} was paid. Consider refunding before deletion.`);
      // You can call your SquarePaymentService.refundPayment here if needed
    }

    // Delete the ride
    await RideModel.findByIdAndDelete(rideId);

    res.status(200).json({
      message: "Ride deleted successfully.",
      rideId,
    });
  } catch (err) {
    console.error("Delete ride error:", err);
    res.status(500).json({ message: "Server error deleting ride." });
  }
};
