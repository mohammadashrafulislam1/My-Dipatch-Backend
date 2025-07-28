import express from "express";
import { getPricingHistory, getPricingSettings, 
    updatePricingSettings } from "../../Controllers/AdminController/PricingController.js";

export const pricingRouter = express.Router();

// Get current pricing settings
pricingRouter.get("/", getPricingSettings);

// Update pricing settings (admin only)
pricingRouter.put("/", updatePricingSettings);

// Get pricing history (admin only)
pricingRouter.get("/history", getPricingHistory);
