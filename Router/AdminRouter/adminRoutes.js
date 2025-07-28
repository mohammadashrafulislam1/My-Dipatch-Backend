// routes/adminRoutes.js
import express from 'express';
import { createFAQ, manageFAQs } from '../../Controllers/supportController.js';
import { assignDriverToRide, getAllDrivers, getPendingRides } from '../../Controllers/AdminController/AdminController.js';
// import adminMiddleware from '../middleware/admin.js';

export const adminRouter = express.Router();

// Admin FAQ Management
adminRouter.get('/faqs',  manageFAQs);
adminRouter.post('/faqs',createFAQ);


// Get pending rides for admin dashboard
adminRouter.get("/rides/pending", getPendingRides);

// Get all available drivers
adminRouter.get("/drivers", getAllDrivers);

// Assign driver to a specific ride
adminRouter.put("/rides/assign/:rideId", assignDriverToRide);