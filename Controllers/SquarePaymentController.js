
import { SquarePaymentModel } from '../Model/SquarePayment.js';
import { SquarePaymentService } from '../services/SquarePaymentService.js';
import { addRideTransaction } from './RiderController/DriverWalletController.js';

export class SquarePaymentController {
  // Process payment when customer confirms ride
  static async processPayment(req, res) {
    try {
      const {
        rideId,
        cardToken,
        customerId,
        totalAmount,
        driverAmount,
        adminAmount,
        driverSquareAccountId
      } = req.body;
   console.log("driverSquareAccountId", driverSquareAccountId)
      // Validate
      if (!rideId || !cardToken || !customerId || !totalAmount || !driverAmount || !adminAmount) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      // Process payment
      const paymentResult = await SquarePaymentService.processRidePayment({
        sourceId: cardToken,
        rideId,
        customerId,
        totalAmount: parseFloat(totalAmount),
        driverAmount: parseFloat(driverAmount),
        adminAmount: parseFloat(adminAmount),
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: "Payment failed"
        });
      }

      res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        payment: {
          id: paymentResult.paymentId,
          status: paymentResult.status,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          receiptUrl: paymentResult.receiptUrl
        }
      });

    } catch (error) {
      console.error("Payment error:", error);
      res.status(500).json({
        success: false,
        message: "Payment processing failed",
        error: error.message
      });
    }
  }

  // Mark driver as paid when ride completes
 static async markDriverPaid(req, res) {
  try {
    const { rideId, driverId } = req.body;

    // Validate required fields
    if (!rideId || !driverId) {
      return res.status(400).json({
        success: false,
        message: "rideId and driverId are required"
      });
    }

    const paymentRecord = await SquarePaymentModel.findOne({ rideId });
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found"
      });
    }

    // If driverId already exists in record, verify it matches
    if (paymentRecord.driverId && paymentRecord.driverId.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Driver ID mismatch"
      });
    }

    // Mark driver as paid
    paymentRecord.driverId = driverId;
    paymentRecord.driverPaid = true;
    paymentRecord.driverPaidAt = new Date();
    await paymentRecord.save();

    // Add to driver's wallet
    await addRideTransaction({
      driverId,
      amount: paymentRecord.driverAmount,
      rideId: paymentRecord.rideId,
      method: "square"
    });

    res.json({
      success: true,
      message: "Driver payment recorded",
      amount: paymentRecord.driverAmount
    });

  } catch (error) {
    console.error("Mark driver paid error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

  // Handle refund when ride is cancelled
  static async handleRefund(req, res) {
    try {
      const { rideId, reason = "Ride cancelled" } = req.body;

      const paymentRecord = await SquarePaymentModel.findOne({ rideId });
      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      // Only refund if payment was successful
      if (paymentRecord.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: "Payment not completed, cannot refund"
        });
      }

      // Process refund through Square
      const refundResult = await SquarePaymentService.refundPayment(
        paymentRecord.squarePaymentId,
        rideId,
        paymentRecord.totalAmount,
        reason
      );

      res.json({
        success: true,
        message: "Refund processed",
        refund: refundResult
      });

    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payment status
  static async getPaymentStatus(req, res) {
    try {
      const { rideId } = req.params;

      const paymentRecord = await SquarePaymentModel.findOne({ rideId });
      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          message: "No payment record found"
        });
      }

      res.json({
        success: true,
        payment: paymentRecord
      });

    } catch (error) {
      console.error("Get payment status error:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get driver's Square earnings
  static async getDriverSquareEarnings(req, res) {
    try {
      const { driverId } = req.params;

      const payments = await SquarePaymentModel.find({
        driverId,
        driverPaid: true,
        paymentStatus: 'paid'
      });

      const totalEarnings = payments.reduce((sum, payment) => sum + payment.driverAmount, 0);

      res.json({
        success: true,
        totalEarnings,
        payments: payments.map(p => ({
          rideId: p.rideId,
          amount: p.driverAmount,
          date: p.driverPaidAt,
          currency: p.currency
        }))
      });

    } catch (error) {
      console.error("Get driver earnings error:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

 

static async getAllTransactions(req, res) {
  try {
    const transactions = await SquarePaymentModel.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      payments: transactions
    });
  } catch (error) {
    console.error("Get all transactions error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// Get all pending driver payments (driverPaid = false)
static async getPendingDriverPayments(req, res) {
  try {
    const payments = await SquarePaymentModel.find({
      driverPaid: false,
      paymentStatus: 'paid'
    }).sort({ createdAt: 1 }); // oldest first

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("Get pending driver payments error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
 // Save Square payout method (frontend sends card token)
  static async saveSquarePayout(req, res) {
    try {
      const { token } = req.body;
      const driverId = req.user.id; // assuming auth middleware adds user

      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }

      // Save token to DB (or process via Square API to attach account)
      const payout = await SquarePaymentModel.create({
        driverId,
        squareToken: token,
        createdAt: new Date()
      });

      res.json({ success: true, message: "Square payout method saved", payout });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}