import express from "express";
import { getPolicies, getPolicyHistory, updatePolicy } from "../Controllers/PolicyController.js";
import { verifyToken } from "../Middleware/jwt.js";

export const policyRouter = express.Router();

// Get both policies (public access)
policyRouter.get("/", verifyToken("admin"), getPolicies);

// Update a policy (admin only)
policyRouter.put("/:type", verifyToken("admin"), updatePolicy);

// Get policy history (admin only)
policyRouter.get("/history", verifyToken("admin"), getPolicyHistory);
