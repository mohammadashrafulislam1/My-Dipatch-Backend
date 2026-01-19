import { AdminNotificationModel } from "../../Model/AdminModel/AdminNotification.js";
import { DriverSquareAccount } from "../../Model/DriverModel/DriverSquareAccount.js";
import { DriverWallet } from "../../Model/DriverModel/DriverWallet.js";
import { SquarePaymentModel } from "../../Model/SquarePayment.js";


// Get wallet summary for driver
export const getWalletSummary = async (req, res) => {
  const { driverId } = req.params;

  try {
    const wallet = await DriverWallet.findOne({ driverId });

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
      transactions: wallet.transactions.reverse() // recent first
    });
  } catch (err) {
    console.error("Wallet summary error:", err);
    res.status(500).json({ message: "Error fetching wallet data." });
  }
};

// Add ride payment to wallet
export const addRideTransaction = async ({ driverId, amount, rideId, method = "cash", status }) => {
  try {
    let wallet = await DriverWallet.findOne({ driverId });

    if (!wallet) {
      wallet = new DriverWallet({ driverId, transactions: [], totalEarnings: 0 });
    }

    wallet.transactions.push({
      type: "ride",
      rideId,
      amount,
      method,
      status
    });

    wallet.totalEarnings += amount;
    await wallet.save();
  } catch (err) {
    console.error("Add ride transaction error:", err);
  }
};

// Withdraw earnings
export const requestWithdrawal = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Enter valid amount" });
    }

    // Get pending payments
    const pendingPayments = await SquarePaymentModel.find({
      driverId,
      driverPaid: false,
      paymentStatus: "paid",
    });

    const balance = pendingPayments.reduce((sum, p) => sum + p.driverAmount, 0);

    if (amount > balance) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Get driver bank info
    const bankAccount = await DriverSquareAccount.findOne({ driverId });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: "No bank account found" });
    }

    // Save a withdrawal request for admin
    const withdrawalRequest = await AdminNotificationModel.create({
      type: "withdrawal_request",
      driverId,
      amount,
      bankAccount: {
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        routingNumber: bankAccount.routingNumber,
      },
      status: "pending",
      createdAt: new Date(),
    });

    // Add withdrawal transaction to wallet with status "pending"
    await addRideTransaction({
      driverId,
      amount,
      rideId: null, // since this is a withdrawal, not a ride
      method: "withdrawal",
      status: "pending",
    });

    res.json({ success: true, message: "Withdrawal request sent to admin!" });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};