import express from "express";
import { 
  getPricingSettings, 
  updatePricingSettings,
  getPricingHistory
} from "../controllers/PricingController.js";
import { adminAuth } from "../middleware/authMiddleware.js"; // Admin auth middleware

export const pricingRouter = express.Router();

// Get current pricing settings
pricingRouter.get("/", getPricingSettings);

// Update pricing settings (admin only)
pricingRouter.put("/", adminAuth, updatePricingSettings);

// Get pricing history (admin only)
pricingRouter.get("/history", adminAuth, getPricingHistory);
