import mongoose from "mongoose";
import { AdminNotificationModel } from "../../Model/AdminModel/AdminNotification.js";
import { DriverSquareAccount } from "../../Model/DriverModel/DriverSquareAccount.js";
import { DriverWallet } from "../../Model/DriverModel/DriverWallet.js";
import { SquarePaymentModel } from "../../Model/SquarePayment.js";

// Helper: add ride or withdrawal transaction to wallet
export const addRideTransaction = async ({
  driverId,
  amount,
  rideId = null,
  method = "card",
  status,
  type = "ride",
}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(driverId)) throw new Error("Invalid driverId");
    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    let wallet = await DriverWallet.findOne({ driverId: driverObjectId });

    if (!wallet) {
      wallet = new DriverWallet({
        driverId: driverObjectId,
        transactions: [],
        totalEarnings: 0,
        totalWithdrawn: 0,
      });
    }

    wallet.transactions.push({
      type,
      rideId,
      amount,
      method,
      status,
      createdAt: new Date(),
    });

    if (type === "ride") {
      wallet.totalEarnings += amount;
    }

    await wallet.save();
    console.log("Transaction added:", wallet.transactions[wallet.transactions.length - 1]);
  } catch (err) {
    console.error("Add ride transaction error:", err);
    throw err;
  }
};

// Get wallet summary
export const getWalletSummary = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: "Invalid driver ID" });
    }

    const driverObjectId = new mongoose.Types.ObjectId(driverId);
    const wallet = await DriverWallet.findOne({ driverId: driverObjectId });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found." });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    const todayEarnings = wallet.transactions
      .filter(tx => tx.type === "ride" && new Date(tx.createdAt) >= startOfDay)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const weekEarnings = wallet.transactions
      .filter(tx => tx.type === "ride" && new Date(tx.createdAt) >= startOfWeek)
      .reduce((sum, tx) => sum + tx.amount, 0);

    res.json({
      totalEarnings: wallet.totalEarnings,
      totalWithdrawn: wallet.totalWithdrawn,
      todayEarnings,
      weekEarnings,
      transactions: wallet.transactions.reverse(),
    });
  } catch (err) {
    console.error("Wallet summary error:", err);
    res.status(500).json({ message: "Error fetching wallet data." });
  }
};

// Request withdrawal
export const requestWithdrawal = async (req, res) => {
  try {
    const driverId = req.user.id; // from JWT
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    }

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ success: false, message: "Invalid driver ID" });
    }

    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    // Fetch wallet or create it with earnings from pending payments
    let wallet = await DriverWallet.findOne({ driverId: driverObjectId });
    if (!wallet) {
      // Calculate total earnings from pending Square payments
      const payments = await SquarePaymentModel.find({
        driverId: driverObjectId,
        driverPaid: false,
        paymentStatus: "paid",
      });
      const totalEarnings = payments.reduce((sum, p) => sum + p.driverAmount, 0);

      wallet = new DriverWallet({
        driverId: driverObjectId,
        transactions: [],
        totalEarnings,
        totalWithdrawn: 0,
      });
      await wallet.save();
    }

    // Calculate available balance
    const pendingWithdrawals = wallet.transactions
      .filter(tx => tx.type === "withdrawal" && tx.status === "pending")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const availableBalance = wallet.totalEarnings - wallet.totalWithdrawn - pendingWithdrawals;

    if (amount > availableBalance) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Get driver bank info
    const bankAccount = await DriverSquareAccount.findOne({ driverId: driverObjectId });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: "No bank account found" });
    }

    // Add pending withdrawal to wallet
    await addRideTransaction({
      driverId,
      amount,
      rideId: null,
      method: "withdrawal",
      status: "pending",
      type: "withdrawal",
    });

    // Notify admin
    await AdminNotificationModel.create({
      type: "withdrawal_request",
      driverId: driverObjectId,
      amount,
      bankAccount: {
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        routingNumber: bankAccount.routingNumber,
      },
      status: "pending",
      createdAt: new Date(),
    });

    return res.json({ success: true, message: "Withdrawal request sent to admin!" });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
