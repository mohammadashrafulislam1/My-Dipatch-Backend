import express from "express";
import { getRideHistory, requestRide } from "../../Controllers/CustomerController/RideController.js";

export const rideRouter = express.Router();

rideRouter.post("/request", requestRide);
rideRouter.get("/history/:customerId", getRideHistory);