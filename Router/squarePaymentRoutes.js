import express from 'express';
import { verifyToken } from '../Middleware/jwt.js';
import { SquarePaymentController } from '../Controllers/SquarePaymentController.js';

const squarePaymentRouter = express.Router();

// Call verifyToken() to get the middleware
squarePaymentRouter.post('/process', verifyToken(), SquarePaymentController.processPayment);
squarePaymentRouter.post('/driver-paid', verifyToken(), SquarePaymentController.markDriverPaid);
squarePaymentRouter.post('/refund', verifyToken(), SquarePaymentController.handleRefund);
squarePaymentRouter.post('/withdraw-bank', verifyToken(), SquarePaymentController.withdrawToBank);
squarePaymentRouter.put('/assign-driver', verifyToken(), SquarePaymentController.assignDriver);

// Driver earnings
squarePaymentRouter.get('/driver-earnings/:driverId', verifyToken(), SquarePaymentController.getDriverSquareEarnings);

// Admin-only routes
squarePaymentRouter.get('/status/all', verifyToken('admin'), SquarePaymentController.getAllTransactions);

// Payment status
squarePaymentRouter.get('/status/:rideId', verifyToken(), SquarePaymentController.getPaymentStatus);

// Saved cards
squarePaymentRouter.get('/square-payout', verifyToken(), SquarePaymentController.getDriverSavedCards);

// Pending payments
squarePaymentRouter.get('/driver-pending', verifyToken(), SquarePaymentController.getPendingDriverPayments);

export default squarePaymentRouter;
