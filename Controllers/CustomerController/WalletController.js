import { WalletModel } from "../../Model/CustomerModel/Wallet.js";
import { WalletTransaction } from "../../Model/CustomerModel/WalletTransaction.js";
import crypto from "crypto";
import { createSquareCustomerIfNotExists } from "../SquarePaymentController.js";
import { UserModel } from "../../Model/User.js";
import { cardsApi } from "../../config/square.js";

export const saveUserCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardToken } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const squareCustomerId = await createSquareCustomerIfNotExists(user);

    const { result } = await cardsApi.createCard({
      idempotencyKey: crypto.randomUUID(),
      sourceId: cardToken,
      card: {
        cardholderName: user.firstName + " " + user.lastName,
        customerId: squareCustomerId,
      },
    });

    const card = result.card;

    user.savedCards.push({
      squareCardId: card.id,
      last4: card.last4,
      brand: card.cardBrand,
    });
    await user.save();

    res.json({ success: true, card });
  } catch (err) {
    console.error("Save card error:", err);
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