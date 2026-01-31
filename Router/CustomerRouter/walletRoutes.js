// routes/walletRoutes.js
import express from "express";
import { addMoney, getTransactions, getWallet, payWithSavedCard, saveUserCard, withdrawMoney } from "../../Controllers/CustomerController/WalletController.js";
import { verifyToken } from "../../Middleware/jwt.js";

export const walletRouter = express.Router();
walletRouter.post("/save-card", saveUserCard);
walletRouter.post("/pay-with-saved-card", verifyToken(), payWithSavedCard);

walletRouter.post("/add", addMoney);
walletRouter.post("/withdraw", withdrawMoney);
walletRouter.get("/:userId", getWallet);
walletRouter.get("/transactions/:userId", getTransactions);

