import { AdminNotificationModel } from "../../Model/AdminModel/AdminNotification.js";
import { PricingModel } from "../../Model/AdminModel/Pricing.js";
import { TransactionModel } from "../../Model/AdminModel/Wallet.js";
import { DriverWallet } from "../../Model/DriverModel/DriverWallet.js";


// Get wallet dashboard summary
export const getWalletDashboard = async (req, res) => {
  try {
    // Aggregate financial data
    const aggregation = await TransactionModel.aggregate([
      {
        $group: {
          _id: null,
          totalFareCollected: { $sum: "$totalFare" },
          totalPaidToDrivers: { $sum: "$driverEarning" },
          totalAdminEarnings: { $sum: "$adminCut" }
        }
      }
    ]);

    const dashboardData = aggregation[0] || {
      totalFareCollected: 0,
      totalPaidToDrivers: 0,
      totalAdminEarnings: 0
    };

    // Get transaction history
    const transactions = await TransactionModel.find()
      .sort({ date: -1 })
      .populate("customerId", "firstName lastName")
      .populate("driverId", "firstName lastName");

    res.json({
      dashboard: dashboardData,
      transactions: transactions.map(t => ({
        date: t.date,
        customer: t.customerId ? `${t.customerId.firstName} ${t.customerId.lastName}` : 'Unknown',
        driver: t.driverId ? `${t.driverId.firstName} ${t.driverId.lastName}` : 'Unknown',
        totalFare: t.totalFare,
        driverEarning: t.driverEarning,
        adminCut: t.adminCut
      }))
    });
  } catch (err) {
    console.error("Wallet dashboard error:", err);
    res.status(500).json({ message: "Server error fetching wallet data" });
  }
};

// Create transaction when ride is completed
export const createTransaction = async (ride) => {
  try {
    // Get pricing settings
    const pricing = await PricingModel.findOne();
    
    if (!pricing) {
      throw new Error("Pricing configuration not found");
    }
    
    // Calculate earnings
    const adminCut = ride.price * (pricing.adminCommission / 100);
    const driverEarning = ride.price - adminCut;
    
    // Create transaction record
    const transaction = new TransactionModel({
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: ride.driverId,
      totalFare: ride.price,
      driverEarning,
      adminCut
    });
    
    await transaction.save();
    return transaction;
  } catch (err) {
    console.error("Transaction creation error:", err);
    throw err;
  }
};

// Get transaction history with filters
export const getTransactionHistory = async (req, res) => {
  try {
    const { startDate, endDate, driverId, customerId } = req.query;
    const filter = {};
    
    // Date filter
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Driver filter
    if (driverId) {
      filter.driverId = driverId;
    }
    
    // Customer filter
    if (customerId) {
      filter.customerId = customerId;
    }
    
    const transactions = await TransactionModel.find(filter)
      .sort({ date: -1 })
      .populate("customerId", "firstName lastName")
      .populate("driverId", "firstName lastName");
    
    res.json(transactions);
  } catch (err) {
    console.error("Transaction history error:", err);
    res.status(500).json({ message: "Server error fetching transactions" });
  }
};

export const approveWithdrawal = async (req, res) => {
  const { walletId, transactionId } = req.body;

  const wallet = await DriverWallet.findById(walletId);
  const tx = wallet.transactions.id(transactionId);

  if (!tx || tx.type !== "withdrawal")
    return res.status(404).json({ message: "Transaction not found" });

  tx.status = "paid";
  wallet.totalWithdrawn += Math.abs(tx.amount);

  await wallet.save();

  res.json({ success: true, message: "Withdrawal approved & paid" });
};
// GET /payment/withdrawal-requests
export const getWithdrawalRequests = async (req, res) => {
  try {
    const requests = await AdminNotificationModel.find().sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("getWithdrawalRequests error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
