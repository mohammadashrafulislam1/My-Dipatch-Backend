import { DriverWallet } from "../../Model/DriverModel/DriverWallet.js";


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
export const addRideTransaction = async ({ driverId, amount, rideId, method = "cash" }) => {
  try {
    let wallet = await DriverWallet.findOne({ driverId });

    if (!wallet) {
      wallet = new DriverWallet({ driverId, transactions: [], totalEarnings: 0 });
    }

    wallet.transactions.push({
      type: "ride",
      rideId,
      amount,
      method
    });

    wallet.totalEarnings += amount;
    await wallet.save();
  } catch (err) {
    console.error("Add ride transaction error:", err);
  }
};

// Withdraw earnings
export const withdrawToBank = async (req, res) => {
  const { driverId } = req.params;
  const { amount } = req.body;

  try {
    const wallet = await DriverWallet.findOne({ driverId });

    if (!wallet || wallet.totalEarnings - wallet.totalWithdrawn < amount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    wallet.transactions.push({
      type: "withdrawal",
      amount: -amount,
      method: "bank"
    });

    wallet.totalWithdrawn += amount;
    await wallet.save();

    res.json({ message: "Withdrawal successful.", wallet });
  } catch (err) {
    console.error("Withdraw error:", err);
    res.status(500).json({ message: "Failed to withdraw." });
  }
};
