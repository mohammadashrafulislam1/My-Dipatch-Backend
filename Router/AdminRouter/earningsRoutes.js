import express from "express";
import { getAllDrivers, getEarnings, toggleEarningStatus } from "../../Controllers/AdminController/EarningsController.js";

export const earningsRouter = express.Router();

// Get earnings with filters
earningsRouter.get("/", getEarnings);

// Toggle earning status
earningsRouter.put("/:id/status", toggleEarningStatus);

// Get all drivers for filter dropdown
earningsRouter.get("/drivers", getAllDrivers);
