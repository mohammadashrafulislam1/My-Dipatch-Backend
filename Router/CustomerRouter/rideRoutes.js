import express from "express";
import { requestRide } from "../../Controllers/CustomerController/RideController";

export const rideRouter = express.Router();

rideRouter.post("/request", requestRide);