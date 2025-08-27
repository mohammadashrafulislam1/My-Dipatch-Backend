// routes/supportRoutes.js
import express from 'express';
import { createTicket, getSupportCenter } from '../Controllers/SupportController.js';
import { verifyToken } from '../Middleware/jwt.js';

export const supportRouter = express.Router();

// Driver/Customer Support Center
supportRouter.get('/', verifyToken, getSupportCenter);
supportRouter.post('/ticket', verifyToken, createTicket);
