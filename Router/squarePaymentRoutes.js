// routes/squarePaymentRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { SquarePaymentController } from '../Controllers/SquarePaymentController.js';

const squarePaymentRouter = express.Router();

// Process Square payment
squarePaymentRouter.post('/process', authenticateToken, SquarePaymentController.processPayment);

// Mark driver as paid (call this when ride completes)
squarePaymentRouter.post('/driver-paid', authenticateToken, SquarePaymentController.markDriverPaid);

// Handle refund
squarePaymentRouter.post('/refund', authenticateToken, SquarePaymentController.handleRefund);

// Get payment status
squarePaymentRouter.get('/status/:rideId', authenticateToken, SquarePaymentController.getPaymentStatus);

// Get driver's Square earnings
squarePaymentRouter.get('/driver-earnings/:driverId', authenticateToken, SquarePaymentController.getDriverSquareEarnings);

export default squarePaymentRouter;