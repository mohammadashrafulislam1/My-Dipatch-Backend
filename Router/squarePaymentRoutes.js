// routes/squarePaymentRoutes.js
import express from 'express';
import { SquarePaymentController } from '../Controllers/SquarePaymentController.js';
import { verifyToken } from '../Middleware/jwt.js';

const squarePaymentRouter = express.Router();

// Process Square payment
squarePaymentRouter.post('/process', verifyToken(), SquarePaymentController.processPayment);

// Mark driver as paid (call this when ride completes)
squarePaymentRouter.post('/driver-paid', verifyToken(), SquarePaymentController.markDriverPaid);

// Handle refund
squarePaymentRouter.post('/refund', verifyToken(), SquarePaymentController.handleRefund);

// Get payment status
squarePaymentRouter.get('/status/:rideId', verifyToken(), SquarePaymentController.getPaymentStatus);

// Get driver's Square earnings
squarePaymentRouter.get('/driver-earnings/:driverId', verifyToken(), SquarePaymentController.getDriverSquareEarnings);
// routes/squarePaymentRoutes.js

// Get all transactions
squarePaymentRouter.get('/status/all', verifyToken(), SquarePaymentController.getAllTransactions);

// Get pending driver payments (for Pay Driver page)
squarePaymentRouter.get('/driver-pending', verifyToken(), SquarePaymentController.getPendingDriverPayments);

export default squarePaymentRouter;