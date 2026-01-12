// src/services/SquarePaymentService.js
import { v4 as uuidv4 } from 'uuid';
import { SquarePaymentModel } from '../Model/SquarePayment.js';
import { RideModel } from '../Model/CustomerModel/Ride.js';
import { paymentsApi, refundsApi } from '../config/square.js';

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
      const totalCents = Math.round(Number(totalAmount) * 100);
      const adminCents = Math.round(Number(adminAmount) * 100);

      const idempotencyKey = `ride-${rideId}-${uuidv4().slice(0, 8)}`;

      const paymentRequest = {
        sourceId,
        idempotencyKey,

        // 🔴 MUST be BigInt in Square v43+
        amountMoney: { amount: BigInt(totalCents), currency: 'CAD' },
        appFeeMoney: { amount: BigInt(adminCents), currency: 'CAD' },

        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: `ride-${rideId}`,
        note: `Ride #${rideId} | Customer: ${customerId}`,
        autocomplete: true,
        metadata: {
          rideId,
          customerId,
          driverId: driverId || 'unassigned',
          type: 'ride_fare'
        },
      };

     const response = await paymentsApi.create(paymentRequest);
     console.log(response)
const payment = response.payment; // get payment directly

if (!payment) {
  throw new Error("Payment response is empty or invalid.");
}

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
  amount: Number(payment.amountMoney.amount) / 100,
  currency: payment.amountMoney.currency,
  receiptUrl: payment.receiptUrl,
};


    } catch (error) {
      console.error('Square payment error:', error);
      throw new Error(
        `Payment failed: ${error.errors?.[0]?.message || error.message}`
      );
    }
  }

  static async refundPayment(paymentId, rideId, amount, reason = 'Ride cancelled') {
    try {
      const cents = Math.round(Number(amount) * 100);

      const refundRequest = {
        paymentId,
        idempotencyKey: `refund-${rideId}-${Date.now()}`,
        amountMoney: { amount: BigInt(cents), currency: 'CAD' }, // 🔴 BigInt here too
        reason,
        metadata: { rideId, type: 'ride_refund' },
      };

      const { result } = await refundsApi.refund(refundRequest);
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
        amount: Number(refund.amountMoney.amount) / 100,
      };

    } catch (error) {
      console.error('Square refund error:', error);
      throw error;
    }
  }
}
