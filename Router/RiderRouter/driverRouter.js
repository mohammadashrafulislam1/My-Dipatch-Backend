import express from "express";
import { acceptRide, getAvailableRides, getDriverEarnings, getDriverOrderHistory, getDriverRideHistory } from "../../Controllers/RiderController/DriverController.js";

export const driverRouter = express.Router();

driverRouter.get("/available", getAvailableRides);
driverRouter.put("/accept/:rideId", acceptRide);
driverRouter.get("/history/:driverId", getDriverRideHistory);
driverRouter.get("/earnings/:driverId", getDriverEarnings);
driverRouter.get("/orders/:driverId", getDriverOrderHistory);