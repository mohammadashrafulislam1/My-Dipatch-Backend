import express from "express";
import { getDriverReviews, submitReview } from "../Controllers/ReviewController.js";

export const reviewRouter = express.Router();

// Customer submits review
reviewRouter.post("/", submitReview);

// Driver gets their reviews
reviewRouter.get("/driver/:driverId", getDriverReviews);
