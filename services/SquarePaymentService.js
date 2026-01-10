import { v4 as uuidv4 } from 'uuid';
import { SquarePaymentModel } from '../Model/SquarePayment.js';
import { RideModel } from '../Model/CustomerModel/Ride.js';
import squareClient from '../config/square.js'; // default import

export class SquarePaymentService {
  static async processRidePayment({
    sourceId,
    rideId,
    customerId,
    driverId = null,
    totalAmount,
    driverAmount,
    adminAmount,
  }) {
    try {
      const totalCents = Math.round(totalAmount * 100);
      const adminCents = Math.round(adminAmount * 100);
      const idempotencyKey = `ride-${rideId}-${uuidv4().slice(0, 8)}`;

      const paymentRequest = {
        sourceId,
        idempotencyKey,
        amountMoney: { amount: totalCents, currency: 'CAD' },
        appFeeMoney: { amount: adminCents, currency: 'CAD' },
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: `ride-${rideId}`,
        note: `Ride #${rideId} | Customer: ${customerId}`,
        autocomplete: true,
        metadata: { rideId, customerId, driverId: driverId || 'unassigned', type: 'ride_fare' },
      };

      // ✅ Use squareClient.payments.createPayment
      const { result, statusCode } = await squareClient.payments.createPayment(paymentRequest);
      const payment = result.payment;

      const paymentRecord = new SquarePaymentModel({
        rideId,
        customerId,
        driverId,
        totalAmount,
        driverAmount,
        adminAmount,
        currency: 'CAD',
        paymentStatus: payment.status === 'COMPLETED' ? 'paid' : 'failed',
        squarePaymentId: payment.id,
        cardLast4: payment.cardDetails?.card?.last4,
        cardBrand: payment.cardDetails?.card?.cardBrand,
        receiptUrl: payment.receiptUrl,
        processedAt: new Date(),
      });

      await paymentRecord.save();

      await RideModel.findByIdAndUpdate(rideId, {
        isPaid: payment.status === 'COMPLETED',
        paymentStatus: payment.status === 'COMPLETED' ? 'paid' : 'failed',
      });

      return {
        success: payment.status === 'COMPLETED',
        paymentId: payment.id,
        status: payment.status,
        paymentRecordId: paymentRecord._id,
        amount: payment.amountMoney.amount / 100,
        currency: payment.amountMoney.currency,
        receiptUrl: payment.receiptUrl,
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
        amountMoney: { amount: Math.round(amount * 100), currency: 'CAD' },
        reason,
        metadata: { rideId, type: 'ride_refund' },
      };

      // ✅ Use squareClient.refunds.refundPayment
      const { result } = await squareClient.refunds.refundPayment(refundRequest);
      const refund = result.refund;

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
        amount: refund.amountMoney.amount / 100,
      };
    } catch (error) {
      console.error('Square refund error:', error);
      throw error;
    }
  }
}
