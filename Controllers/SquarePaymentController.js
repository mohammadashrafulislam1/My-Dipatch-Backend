import crypto from "crypto";
import { DriverSquareAccount } from "../Model/DriverModel/DriverSquareAccount.js";
import { SquarePaymentModel } from "../Model/SquarePayment.js";
import { SquarePaymentService } from "../services/SquarePaymentService.js";
import { addRideTransaction } from "./RiderController/DriverWalletController.js";
import { PayoutsApi } from "square/legacy";

export class SquarePaymentController {

  // ------------------ PAYMENTS ------------------
  static async processPayment(req, res) {
    try {
      const {
        rideId,
        cardToken,
        customerId,
        totalAmount,
        driverAmount,
        adminAmount,
      } = req.body;

      if (!rideId || !cardToken || !customerId || !totalAmount || !driverAmount || !adminAmount) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const paymentResult = await SquarePaymentService.processRidePayment({
        sourceId: cardToken,
        rideId,
        customerId,
        totalAmount: parseFloat(totalAmount),
        driverAmount: parseFloat(driverAmount),
        adminAmount: parseFloat(adminAmount),
      });

      if (!paymentResult.success) {
        return res.status(400).json({ success: false, message: "Payment failed" });
      }

      res.json({ success: true, payment: paymentResult });
    } catch (err) {
      console.error("Payment error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ MARK DRIVER PAID ------------------
  static async markDriverPaid(req, res) {
    try {
      const { rideId, driverId } = req.body;

      if (!rideId || !driverId) {
        return res.status(400).json({ success: false, message: "rideId and driverId required" });
      }

      const payment = await SquarePaymentModel.findOne({ rideId });
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

      payment.driverId = driverId;
      payment.driverPaid = true;
      payment.driverPaidAt = new Date();
      await payment.save();

      await addRideTransaction({
        driverId,
        amount: payment.driverAmount,
        rideId,
        method: "square",
      });

      res.json({ success: true, message: "Driver paid" });
    } catch (err) {
      console.error("markDriverPaid error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ REFUND ------------------
  static async handleRefund(req, res) {
    try {
      const { rideId, reason = "Ride cancelled" } = req.body;

      const payment = await SquarePaymentModel.findOne({ rideId });
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

      const refund = await SquarePaymentService.refundPayment(
        payment.squarePaymentId,
        rideId,
        payment.totalAmount,
        reason
      );

      res.json({ success: true, refund });
    } catch (err) {
      console.error("Refund error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ STATUS ------------------
  static async getPaymentStatus(req, res) {
    try {
      const { rideId } = req.params;
      const payment = await SquarePaymentModel.findOne({ rideId });

      if (!payment) return res.status(404).json({ success: false, message: "Not found" });

      res.json({ success: true, payment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ EARNINGS ------------------
  static async getDriverSquareEarnings(req, res) {
    try {
      const { driverId } = req.params;

      const payments = await SquarePaymentModel.find({
        driverId,
        driverPaid: true,
        paymentStatus: "paid",
      });

      const total = payments.reduce((s, p) => s + p.driverAmount, 0);

      res.json({ success: true, totalEarnings: total, payments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ ASSIGN DRIVER ------------------
  static async assignDriver(req, res) {
    try {
      const { rideId, driverId } = req.body;

      let payment = await SquarePaymentModel.findOne({ rideId });
      if (!payment) {
        payment = new SquarePaymentModel({ rideId, driverId });
      } else {
        payment.driverId = driverId;
      }

      await payment.save();
      res.json({ success: true, payment });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ ALL TRANSACTIONS ------------------
  static async getAllTransactions(req, res) {
    try {
      const tx = await SquarePaymentModel.find().sort({ createdAt: -1 });
      res.json({ success: true, payments: tx });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ PENDING PAYMENTS ------------------
  static async getPendingDriverPayments(req, res) {
    try {
      const payments = await SquarePaymentModel.find({
        driverPaid: false,
        paymentStatus: "paid",
      });
      res.json({ success: true, payments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ SAVED CARDS ------------------
  static async getDriverSavedCards(req, res) {
    try {
      const driverId = req.user.id;
      const cards = await DriverSquareAccount.find({ driverId });
      res.json({ success: true, cards });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------ BANK PAYOUT ------------------
  static async processDriverPayoutToBank({ driverBankAccount, amount, driverId }) {
    try {
      const cents = BigInt(Math.round(amount * 100));
      const idempotencyKey = crypto.randomBytes(10).toString("hex"); // 20 chars

      const payoutRequest = {
        idempotencyKey,
        locationId: process.env.SQUARE_LOCATION_ID,
        destination: {
          type: "BANK_ACCOUNT",
          bankAccountId: driverBankAccount.bankAccountId,
        },
        amountMoney: {
          amount: cents,
          currency: "CAD",
        },
        note: `Driver payout ${driverId}`,
      };

      const response = await PayoutsApi.createPayout(payoutRequest);

      if (!response.payout) throw new Error("Payout failed");

      return {
        success: true,
        payoutId: response.payout.id,
        status: response.payout.status,
        amount: Number(response.payout.amountMoney.amount) / 100,
      };
    } catch (err) {
      console.error("Bank payout error:", err);
      return { success: false, error: err.message };
    }
  }
// ------------------ SAVE DRIVER BANK ACCOUNT ------------------
static async saveSquarePayout(req, res) {
  try {
    const driverId = req.user.id;
    const { bankName, accountNumber, routingNumber, currency = 'CAD' } = req.body;

    if (!bankName || !accountNumber || !routingNumber) {
      return res.status(400).json({ success: false, message: "All bank account fields are required" });
    }

    // Optional: prevent duplicates by checking existing account numbers
    const existing = await DriverSquareAccount.findOne({ driverId, accountNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: "Bank account already saved" });
    }

    const newBankAccount = new DriverSquareAccount({
      driverId,
      bankName,
      accountNumber, // in production, encrypt this!
      routingNumber,
      currency,
      createdAt: new Date()
    });

    await newBankAccount.save();

    res.json({ success: true, message: "Bank account saved successfully", bankAccount: newBankAccount });
  } catch (err) {
    console.error("saveSquarePayout error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}


  // ------------------ WITHDRAW TO BANK ------------------
  static async withdrawToBank(req, res) {
    try {
      const driverId = req.user.id;
      const { amount } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
      }

      const bankAccount = await DriverSquareAccount.findOne({ driverId });
      if (!bankAccount) {
        return res.status(404).json({ success: false, message: "No bank account found" });
      }

      const pendingPayments = await SquarePaymentModel.find({
        driverId,
        driverPaid: false,
        paymentStatus: "paid",
      });

      const balance = pendingPayments.reduce((s, p) => s + p.driverAmount, 0);
      if (amount > balance) {
        return res.status(400).json({ success: false, message: "Insufficient balance" });
      }

      const payoutResult = await SquarePaymentController.processDriverPayoutToBank({
        driverBankAccount: bankAccount,
        amount: Number(amount),
        driverId,
      });

      if (!payoutResult.success) {
        return res.status(400).json({ success: false, message: "Bank payout failed", error: payoutResult.error });
      }

      let remaining = Number(amount);
      for (const p of pendingPayments) {
        if (remaining <= 0) break;
        p.driverPaid = true;
        p.driverPaidAt = new Date();
        await p.save();
        remaining -= p.driverAmount;
      }

      await addRideTransaction({
        driverId,
        amount: Number(amount),
        method: "bank_withdrawal",
        rideId: null,
      });

      res.json({ success: true, message: "Withdrawal successful", payout: payoutResult });
    } catch (err) {
      console.error("Withdraw error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
