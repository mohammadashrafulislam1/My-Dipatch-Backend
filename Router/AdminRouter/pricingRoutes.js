import express from "express";
import { getPricingHistory, getPricingSettings, 
    updatePricingSettings } from "../../Controllers/AdminController/PricingController.js";
import { verifyToken } from "../../Middleware/jwt.js";

export const pricingRouter = express.Router();

// Get current pricing settings
pricingRouter.get("/", verifyToken("admin"), getPricingSettings);

// Update pricing settings (admin only)
pricingRouter.put("/", verifyToken("admin"), updatePricingSettings);

// Get pricing history (admin only)
pricingRouter.get("/history", verifyToken("admin"), getPricingHistory);
