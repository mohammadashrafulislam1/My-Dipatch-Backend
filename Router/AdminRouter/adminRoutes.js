// routes/adminRoutes.js
import express from 'express';
import { createFAQ, manageFAQs } from '../../Controllers/supportController.js';
// import adminMiddleware from '../middleware/admin.js';

export const adminRouter = express.Router();

// Admin FAQ Management
adminRouter.get('/faqs',  manageFAQs);
adminRouter.post('/faqs',createFAQ);
