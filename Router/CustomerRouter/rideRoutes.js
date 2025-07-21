import express from "express";
import { getDriverRideHistory, getRideHistory, requestRide, updateRideStatus } from "../../Controllers/CustomerController/RideController.js";
import { getDriverEarnings } from "../../Controllers/RiderController/DriverController.js";

export const rideRouter = express.Router();

rideRouter.post("/request", requestRide);
rideRouter.get("/customer/:customerId/history", getRideHistory);

rideRouter.put("/status/:rideId", updateRideStatus);
// Add this line to your existing router
rideRouter.get("/driver/:driverId/history", getDriverRideHistory);

rideRouter.get("/driver/:driverId/earnings", getDriverEarnings);
