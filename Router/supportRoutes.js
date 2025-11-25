// routes/supportRoutes.js
import express from 'express';
import { createTicket, getSupportCenter } from '../Controllers/SupportController.js';
import { verifyToken } from '../Middleware/jwt.js';

export const supportRouter = express.Router();

// Driver/Customer Support Center
supportRouter.get('/driver', verifyToken("driver"), getSupportCenter);
supportRouter.get('/customer', verifyToken("customer"), getSupportCenter);
supportRouter.get('/admin', verifyToken("customer"), getSupportCenter);
supportRouter.post('/ticket/driver', verifyToken("driver"), createTicket);
supportRouter.post('/ticket/customer', verifyToken("customer"), createTicket);
