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
squarePaymentRouter.post('/withdraw-bank', verifyToken(), SquarePaymentController.withdrawToBank);
squarePaymentRouter.put('/assign-driver', verifyToken(), SquarePaymentController.assignDriver);

// Get driver's Square earnings
squarePaymentRouter.get('/driver-earnings/:driverId', verifyToken(), SquarePaymentController.getDriverSquareEarnings);

// routes/squarePaymentRoutes.js
// Get all transactions (admin)
squarePaymentRouter.get('/status/all', verifyToken(), SquarePaymentController.getAllTransactions);

// Get payment status by rideId
squarePaymentRouter.get('/status/:rideId', verifyToken(), SquarePaymentController.getPaymentStatus);

squarePaymentRouter.get('/square-payout', verifyToken(), SquarePaymentController.getDriverSavedCards);


// Get pending driver payments (for Pay Driver page)
squarePaymentRouter.get('/driver-pending', verifyToken(), SquarePaymentController.getPendingDriverPayments);

export default squarePaymentRouter;