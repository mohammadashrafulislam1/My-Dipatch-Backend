// routes/supportRoutes.js
import express from 'express';
import { createTicket, getSupportCenter } from '../Controllers/supportController.js';

export const supportRouter = express.Router();

// Driver/Customer Support Center
supportRouter.get('/', getSupportCenter);
supportRouter.post('/ticket', createTicket);
