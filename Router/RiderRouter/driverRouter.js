import express from "express";
import { acceptRide, getAvailableRides, getDriverRideHistory } from "../../Controllers/RiderController/DriverController";

export const driverRouter = express.Router();

driverRouter.get("/available", getAvailableRides);
driverRouter.put("/accept/:rideId", acceptRide);
driverRouter.get("/history/:driverId", getDriverRideHistory);
