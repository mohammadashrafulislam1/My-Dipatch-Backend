import express from "express";
import { getWalletSummary, requestWithdrawal } from "../../Controllers/RiderController/DriverWalletController.js";
import { verifyToken } from "../../Middleware/jwt.js";

export const driverWalletRouter = express.Router();

driverWalletRouter.get("/:driverId", getWalletSummary);
driverWalletRouter.get("/:driverId", getWalletSummary);
driverWalletRouter.post("/request-withdrawal", verifyToken(), requestWithdrawal);

