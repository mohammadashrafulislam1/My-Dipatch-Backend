import express from "express";
import { checkReviewExists, getDriverReviews, submitReview } from "../Controllers/ReviewController.js";
import { verifyToken } from "../Middleware/jwt.js";

export const reviewRouter = express.Router();

// Customer submits review
reviewRouter.post("/", verifyToken(), submitReview);

// Driver gets their reviews
reviewRouter.get("/driver/:driverId", verifyToken(), getDriverReviews);

reviewRouter.get("/check/:rideId", verifyToken(), checkReviewExists);