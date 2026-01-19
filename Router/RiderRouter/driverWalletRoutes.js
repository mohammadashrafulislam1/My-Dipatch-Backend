import express from "express";
import { getWalletSummary, requestWithdrawal, withdrawToBank } from "../../Controllers/RiderController/DriverWalletController.js";

export const driverWalletRouter = express.Router();

driverWalletRouter.get("/:driverId", getWalletSummary);
driverWalletRouter.get("/:driverId", getWalletSummary);
driverWalletRouter.post("/request-withdrawal", requestWithdrawal);

