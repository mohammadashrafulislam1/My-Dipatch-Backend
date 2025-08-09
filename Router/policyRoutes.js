import express from "express";
import { getPolicies, getPolicyHistory, updatePolicy } from "../Controllers/PolicyController.js";

export const policyRouter = express.Router();

// Get both policies (public access)
policyRouter.get("/", getPolicies);

// Update a policy (admin only)
policyRouter.put("/:type", updatePolicy);

// Get policy history (admin only)
policyRouter.get("/history", getPolicyHistory);
