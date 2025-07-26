import express from "express";
import { getWalletSummary, withdrawToBank } from "../../Controllers/RiderController/DriverWalletController.js";

export const driverWalletRouter = express.Router();

driverWalletRouter.get("/:driverId", getWalletSummary);
driverWalletRouter.post("/withdraw/:driverId", withdrawToBank);

