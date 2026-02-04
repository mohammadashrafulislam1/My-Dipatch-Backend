import { WalletModel } from "../../Model/CustomerModel/Wallet.js";
import { WalletTransaction } from "../../Model/CustomerModel/WalletTransaction.js";
import crypto from "crypto";
import { createSquareCustomerIfNotExists } from "../SquarePaymentController.js";
import { UserModel } from "../../Model/User.js";
import { cardsApi, paymentsApi } from "../../config/square.js";
import { SquarePaymentService } from "../../services/SquarePaymentService.js";

export const saveUserCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardToken } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const squareCustomerId = await createSquareCustomerIfNotExists(user);

    // Create card with Square
    let card;
    try {
    const response = await cardsApi.create({
  idempotencyKey: crypto.randomUUID(),
  sourceId: cardToken,
  card: {
    customerId: squareCustomerId, // ✅ MUST be inside card
    cardholderName: `${user.firstName} ${user.lastName}`,
    billingAddress: {
      addressLine1: "N/A",   // Square requires an object, can be minimal
      locality: "N/A",
      administrativeDistrictLevel1: "N/A",
      postalCode: "00000",
      country: "CA",
    },
    referenceId: user._id.toString(),
  },
});
  console.log(response)
      card = response.result?.card || response?.card;
      if (!card) throw new Error("Card creation failed. No card returned.");
    } catch (err) {
      console.error("Square card creation failed:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    // Save card info in MongoDB
    user.savedCards.push({
      squareCardId: card.id,
      last4: card.last4,
      brand: card.cardBrand,
    });
    await user.save();

    // after card creation
const sanitizedCard = {
  ...card,
  expMonth: Number(card.expMonth),
  expYear: Number(card.expYear),
  version: Number(card.version),
};

res.json({ success: true, card: sanitizedCard });

  } catch (err) {
    console.error("Save card error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// Helper to recursively convert BigInt to number
const convertBigIntToNumber = (obj) => {
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, convertBigIntToNumber(v)])
    );
  }
  return obj;
};

export const payWithSavedCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, rideId, totalAmount, driverAmount, adminAmount } = req.body;

    if (!cardId || !rideId || !totalAmount || !driverAmount || !adminAmount) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const card = user.savedCards.find(c => c.squareCardId === cardId);
    if (!card) return res.status(400).json({ message: "Card not found" });

    // Ensure Square customer exists
    const squareCustomerId = await createSquareCustomerIfNotExists(user);

    // 🚀 USE SAME SERVICE AS NORMAL PAYMENT
    const paymentResult = await SquarePaymentService.processRidePayment({
      sourceId: card.squareCardId,        // saved card on file
      rideId,
      customerId: squareCustomerId,
      totalAmount: parseFloat(totalAmount),
      driverAmount: parseFloat(driverAmount),
      adminAmount: parseFloat(adminAmount),
    });

    if (!paymentResult.success) {
      return res.status(400).json({ success: false, message: "Payment failed" });
    }

    res.json({ success: true, payment: paymentResult });

  } catch (err) {
    console.error("Saved card payment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addMoney = async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid input." });
  
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = new WalletModel({ userId, balance: amount });
    } else {
      wallet.balance += amount;
    }
  
    await wallet.save();
    await WalletTransaction.create({ userId, amount, type: "add" });
  
    res.json({ message: "Money added successfully.", wallet });
  };
  
  export const withdrawMoney = async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ message: "Invalid input." });
  
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet || wallet.balance < amount) return res.status(400).json({ message: "Insufficient funds." });
  
    wallet.balance -= amount;
    await wallet.save();
    await WalletTransaction.create({ userId, amount, type: "withdraw" });
  
    res.json({ message: "Withdrawal successful.", wallet });
  };
  
  export const getWallet = async (req, res) => {
    const { userId } = req.params;
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found." });
  
    res.json(wallet);
  };
  
  export const getTransactions = async (req, res) => {
    const { userId } = req.params;
    const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 });
    res.json(transactions);
  };


