
import { v4 as uuidv4 } from 'uuid';
import { paymentsApi, refundsApi } from '../config/square.js';
import { SquarePaymentModel } from '../Model/SquarePayment.js';
import { RideModel } from '../Model/CustomerModel/Ride.js';

export class SquarePaymentService {
  static async processRidePayment({
    sourceId,        // Square card token
    rideId,
    customerId,
    driverId = null,
    totalAmount,     // Customer total in CAD
    driverAmount,    // Driver's cut in CAD
    adminAmount      // Admin's cut in CAD
  }) {
    try {
      // Convert CAD to cents for Square
      const totalCents = Math.round(totalAmount * 100);
      const adminCents = Math.round(adminAmount * 100);
      
      const idempotencyKey = `ride-${rideId}-${uuidv4().slice(0, 8)}`;

      // Create payment record first
      const paymentRecord = new SquarePaymentModel({
        rideId,
        customerId,
        driverId,
        totalAmount,
        driverAmount,
        adminAmount,
        currency: 'CAD',
        paymentStatus: 'processing'
      });

      await paymentRecord.save();

      // Process payment through Square
      const paymentRequest = {
        sourceId,
        idempotencyKey,
        amountMoney: {
          amount: totalCents,
          currency: 'CAD'
        },
        appFeeMoney: {
          amount: adminCents,
          currency: 'CAD'
        },
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: `ride-${rideId}`,
        note: `Ride #${rideId} | Customer: ${customerId}`,
        autocomplete: true,
        metadata: {
          rideId,
          customerId,
          driverId: driverId || 'unassigned',
          type: 'ride_fare'
        }
      };

      const { result: { payment } } = await paymentsApi.createPayment(paymentRequest);

      // Update payment record
      paymentRecord.squarePaymentId = payment.id;
      paymentRecord.paymentStatus = payment.status === 'COMPLETED' ? 'paid' : 'failed';
      paymentRecord.cardLast4 = payment.cardDetails?.last4;
      paymentRecord.cardBrand = payment.cardDetails?.cardBrand;
      paymentRecord.receiptUrl = payment.receiptUrl;
      paymentRecord.processedAt = new Date();
      
      await paymentRecord.save();
// ✅ UPDATE RIDE PAYMENT STATUS
if (payment.status === "COMPLETED") {
  await RideModel.findByIdAndUpdate(rideId, {
    isPaid: true,
    paymentStatus: "paid"
  });
} else {
  await RideModel.findByIdAndUpdate(rideId, {
    paymentStatus: "failed"
  });
}
      return {
        success: payment.status === 'COMPLETED',
        paymentId: payment.id,
        status: payment.status,
        paymentRecordId: paymentRecord._id,
        amount: payment.totalMoney.amount / 100,
        currency: payment.totalMoney.currency,
        receiptUrl: payment.receiptUrl
      };

    } catch (error) {
      console.error('Square payment error:', error);
      throw new Error(`Payment failed: ${error.errors?.[0]?.detail || error.message}`);
    }
  }

  static async getPaymentByRideId(rideId) {
    return await SquarePaymentModel.findOne({ rideId });
  }

  static async refundPayment(paymentId, rideId, amount, reason = 'Ride cancelled') {
    try {
      const refundRequest = {
        paymentId,
        idempotencyKey: `refund-${rideId}-${Date.now()}`,
        amountMoney: {
          amount: Math.round(amount * 100),
          currency: 'CAD'
        },
        reason,
        metadata: {
          rideId,
          type: 'ride_refund'
        }
      };

      const { result: { refund } } = await refundsApi.refundPayment(refundRequest);
      
      // Update payment record
      const paymentRecord = await SquarePaymentModel.findOne({ squarePaymentId: paymentId });
      if (paymentRecord) {
        paymentRecord.paymentStatus = 'refunded';
        paymentRecord.refundedAt = new Date();
        await paymentRecord.save();
      }

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amountMoney.amount / 100
      };

    } catch (error) {
      console.error('Square refund error:', error);
      throw error;
    }
  }
}